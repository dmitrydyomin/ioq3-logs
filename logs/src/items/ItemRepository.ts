import { Service } from 'typedi';

import { Db } from '../services/Db';
import { Item, ItemInsert } from './ItemTypes';

@Service()
export class ItemRepository {
  private table = 'items';

  constructor(private db: Db) {}

  private t() {
    return this.db.knex<Item>(this.table);
  }

  async create(data: ItemInsert, created_at: Date) {
    await this.t().insert({
      ...data,
      created_at,
    });
  }
}
