import { Service } from 'typedi';
import knex from 'knex';

import { Config } from '../Config';

@Service()
export class Db {
  public knex: knex;

  constructor(config: Config) {
    this.knex = knex(config.db);
  }
}
