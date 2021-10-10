import { Service } from 'typedi';

import { Db } from '../services/Db';
import { Kill, KillInsert } from './KillTypes';

@Service()
export class KillRepository {
  private table = 'kills';

  constructor(private db: Db) {}

  private t() {
    return this.db.knex<Kill>(this.table);
  }

  async create(data: KillInsert, created_at: Date) {
    await this.t().insert({
      ...data,
      created_at,
    });
  }
}
