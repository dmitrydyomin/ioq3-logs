import { Service } from 'typedi';
import knex, { Knex } from 'knex';

import { Config } from '../Config';

@Service()
export class Db {
  public knex: Knex;

  constructor(config: Config) {
    this.knex = knex(config.db);
  }
}
