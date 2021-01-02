import { NotFoundError } from 'routing-controllers';
import { Service } from 'typedi';

import { Db } from '../services/Db';
import { Player, PlayerInsert } from './PlayerTypes';

@Service()
export class PlayerRepository {
  private table = 'players';

  constructor(private db: Db) {}

  private t() {
    return this.db.knex<Player>(this.table);
  }

  async findOne(id: number) {
    const row = await this.t().where({ id }).first();
    if (!row) {
      throw new NotFoundError();
    }
    return row;
  }

  async findByName(name: string) {
    const row = await this.t().where({ name }).first();
    return row;
  }

  async findOrCreate(data: PlayerInsert): Promise<Player> {
    const now = new Date();
    const existing = await this.findByName(data.name);
    if (existing) {
      if (data.model !== existing.model) {
        await this.t()
          .where({ id: existing.id })
          .update({ updated_at: now, model: data.model });
        return this.findOne(existing.id);
      }
      return existing;
    }
    const [id] = await this.t()
      .insert({
        created_at: now,
        updated_at: now,
        name: data.name,
        model: data.model,
      })
      .returning('id');
    return this.findOne(id);
  }

  async findAll() {
    const rows = await this.t();
    return rows.reduce(
      (all, r) => ({ ...all, [r.id]: r }),
      <Record<number, Player>>{}
    );
  }
}
