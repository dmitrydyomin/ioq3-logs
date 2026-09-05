import { Knex } from 'knex';
import { Service } from 'typedi';

interface MysqlField {
  type: string;
  length: number;
  string(): string | null;
}

@Service()
export class Config {
  app = {
    port: parseInt(process.env.PORT || '3001'),
  };

  client = {
    enabled: process.env.CLIENT_DISABLED !== '1',
    host: process.env.QUAKE_HOST || 'quake',
    port: parseInt(process.env.QUAKE_PORT || '3000'),
  };

  db: Knex.Config = {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: 'quake',
      user: 'quake',
      password: process.env.DB_PASSWORD || 'quake',
      // MySQL has no boolean type, so knex stores booleans as tinyint(1).
      // Convert them back, otherwise columns typed as boolean read as 0 / 1.
      typeCast: (field: MysqlField, next: () => unknown) =>
        field.type === 'TINY' && field.length === 1
          ? field.string() === '1'
          : next(),
    },
  };

  players = {
    useIcons: process.env.USE_PLAYER_ICONS === '1',
  };

  sounds = {
    armorDelay: 22000,
    enabled: process.env.PLAY_SOUNDS === '1',
    playerId: 1,
  };
}
