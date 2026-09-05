import 'reflect-metadata';

import knex, { Knex } from 'knex';
import { Container } from 'typedi';

import { Config } from '../Config';

/**
 * Copies the contents of the old PostgreSQL database into the MySQL one.
 *
 * The target schema is created by the regular knex migrations, so run
 * `npm run migrate` against MySQL before running this tool.
 *
 * Source connection is taken from PG_* env vars, target connection from the
 * usual DB_* ones (the same config the app itself uses).
 *
 * Usage:
 *   npm run migrate:data -- [--truncate] [--batch=500]
 *
 * Note on timestamps: PostgreSQL stores `timestamptz` (absolute instants)
 * while MySQL `datetime` stores wall clock time. Both drivers convert through
 * JS `Date` using the process timezone, so run this tool with the same TZ the
 * application runs with, otherwise timestamps will be shifted.
 */

// Ordered so that a table is always copied after the tables it references.
const TABLES = ['players', 'games', 'game_players', 'kills', 'items'] as const;

interface Options {
  batchSize: number;
  truncate: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { batchSize: 500, truncate: false };

  for (const arg of argv) {
    if (arg === '--truncate') {
      opts.truncate = true;
      continue;
    }
    const batch = arg.match(/^--batch=(\d+)$/);
    if (batch) {
      opts.batchSize = parseInt(batch[1]);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!(opts.batchSize > 0)) {
    throw new Error('--batch must be a positive number');
  }

  return opts;
}

function sourceConfig(): Knex.Config {
  return {
    client: 'pg',
    connection: {
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT || '5432'),
      database: process.env.PG_DATABASE || 'quake',
      user: process.env.PG_USER || 'quake',
      password: process.env.PG_PASSWORD || 'quake',
    },
  };
}

async function assertSchema(target: Knex) {
  for (const table of TABLES) {
    if (!(await target.schema.hasTable(table))) {
      throw new Error(
        `Table "${table}" is missing in the target database. ` +
          'Run `npm run migrate` first.',
      );
    }
  }
}

async function count(db: Knex, table: string) {
  const [row] = await db(table).count<{ count: string | number }[]>(
    '* as count',
  );
  return Number(row.count);
}

async function truncate(target: Knex) {
  // Reverse dependency order, so foreign keys stay satisfied at every step.
  for (const table of [...TABLES].reverse()) {
    const deleted = await target(table).del();
    console.log(`  cleared ${table} (${deleted} rows)`);
  }
}

async function assertEmpty(target: Knex) {
  for (const table of TABLES) {
    const rows = await count(target, table);
    if (rows > 0) {
      throw new Error(
        `Target table "${table}" already contains ${rows} rows. ` +
          'Pass --truncate to replace the existing data.',
      );
    }
  }
}

async function copyTable(source: Knex, target: Knex, table: string, batchSize: number) {
  const total = await count(source, table);
  let copied = 0;
  let lastId = 0;

  for (;;) {
    const rows = await source(table)
      .where('id', '>', lastId)
      .orderBy('id')
      .limit(batchSize);

    if (rows.length === 0) {
      break;
    }

    // Ids are preserved so that foreign keys keep pointing at the right rows.
    await target(table).insert(rows);

    lastId = rows[rows.length - 1].id;
    copied += rows.length;
    console.log(`  ${table}: ${copied}/${total}`);
  }

  return copied;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const source = knex(sourceConfig());
  const target = knex(Container.get(Config).db);

  try {
    console.log(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

    await assertSchema(target);

    if (opts.truncate) {
      console.log('Clearing target tables...');
      await truncate(target);
    } else {
      await assertEmpty(target);
    }

    for (const table of TABLES) {
      console.log(`Copying ${table}...`);
      await copyTable(source, target, table, opts.batchSize);
    }

    console.log('Verifying...');
    let failed = false;
    for (const table of TABLES) {
      const [from, to] = await Promise.all([
        count(source, table),
        count(target, table),
      ]);
      const status = from === to ? 'ok' : 'MISMATCH';
      if (from !== to) {
        failed = true;
      }
      console.log(`  ${table}: ${from} -> ${to} ${status}`);
    }

    if (failed) {
      throw new Error('Row counts do not match, the data was not fully copied');
    }

    console.log('Done.');
  } finally {
    await Promise.all([source.destroy(), target.destroy()]);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
