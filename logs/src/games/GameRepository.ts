import { NotFoundError } from 'routing-controllers';
import { Service } from 'typedi';

import { Db } from '../services/Db';
import { Game, GamePlayer } from './GameTypes';

@Service()
export class GameRepository {
  private table = 'games';
  private tablePlayers = 'game_players';

  constructor(private db: Db) {}

  private t() {
    return this.db.knex<Game>(this.table);
  }

  private tp() {
    return this.db.knex<GamePlayer>(this.tablePlayers);
  }

  async findOne(id: number) {
    const row = await this.t().where({ id }).first();
    if (!row) {
      throw new NotFoundError();
    }
    return row;
  }

  async start() {
    const [id] = await this.t()
      .insert({
        started_at: new Date(),
      })
      .returning('id');
    return this.findOne(id);
  }

  async end(id: number) {
    await this.t().where({ id }).update({
      ended_at: new Date(),
    });
    return this.findOne(id);
  }

  async playerEnter(game_id: number, player_id: number) {
    const where = { game_id, player_id };
    const patch = {
      entered_at: new Date(),
      left_at: null,
      score: 0,
    };
    const affected = await this.tp().where(where).update(patch);
    if (affected === 0) {
      await this.tp().insert({ ...where, ...patch });
    }
  }

  async playerLeave(game_id: number, player_id: number) {
    await this.tp()
      .where({ game_id, player_id })
      .update({ left_at: new Date() });
  }

  async addScore(game_id: number, player_id: number) {
    await this.tp().where({ game_id, player_id }).increment('score');
  }

  async subScore(game_id: number, player_id: number) {
    await this.tp().where({ game_id, player_id }).decrement('score');
  }
}
