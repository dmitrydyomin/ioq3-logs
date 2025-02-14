import { NotFoundError } from 'routing-controllers';
import { Service } from 'typedi';

import { Config } from '../Config';
import { PlayerRepository } from '../players/PlayerRepository';
import { Db } from '../services/Db';
import { ClientGame, Game, GamePlayer } from './GameTypes';

@Service()
export class GameRepository {
  private table = 'games';
  private tablePlayers = 'game_players';

  constructor(
    private config: Config,
    private db: Db,
    private players: PlayerRepository,
  ) {}

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

  async start(started_at: Date) {
    const [id] = await this.t()
      .insert({
        started_at,
        show_in_stats: false,
      })
      .returning('id');
    return this.findOne(id.id);
  }

  async end(id: number, ended_at: Date) {
    await this.t().where({ id }).update({
      ended_at,
    });
    let saved = await this.findOne(id);
    const players = await this.getGamePlayers([id]);
    if (this.showInStats(saved, players[id] || [])) {
      await this.t().where({ id }).update({ show_in_stats: true });
      saved = await this.findOne(id);
    }
    return saved;
  }

  async playerEnter(game_id: number, player_id: number, entered_at: Date) {
    const where = { game_id, player_id };
    const patch = {
      entered_at,
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

  private async getGamePlayers(gameIds: number[]) {
    const rows = await this.tp().whereIn('game_id', gameIds);
    return rows.reduce(
      (all, r) => ({
        ...all,
        [r.game_id]: [...(all[r.game_id] || []), r],
      }),
      {} as Record<number, GamePlayer[]>,
    );
  }

  private showInStats(game: Game, players: GamePlayer[]) {
    if (!game.ended_at) {
      return false;
    }
    const duration = game.ended_at.getTime() - game.started_at.getTime();
    if (duration < 9 * 60 * 1000) {
      return false;
    }
    const fp = players.filter(
      (p) => p.entered_at.getTime() - game.started_at.getTime() < 10000,
    );
    return fp.length > 1 && fp.some((p) => !p.left_at);
  }

  async getClientGames(all: boolean) {
    const q = this.t()
      .where({ show_in_stats: true })
      .whereNotNull('ended_at')
      .orderBy('started_at', 'desc');

    if (!all) {
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 1, 0, 1);
      minDate.setHours(0, 0, 0, 0);
      q.where('started_at', '>=', minDate);
    }

    const games = await q;

    const gamePlayers = await this.getGamePlayers(games.map((g) => g.id));
    const players = await this.players.findAll();

    return games.map(
      (g): ClientGame => ({
        id: g.id,
        started_at: g.started_at,
        players: (gamePlayers[g.id] || []).map((gp) => ({
          id: players[gp.player_id]?.id || 0,
          name: players[gp.player_id]?.name || '',
          model: players[gp.player_id]?.model || '',
          score: gp.score,
        })),
      }),
    );
  }

  private weekStart(d: Date) {
    const day = d.getDay();
    const res = new Date(d.getTime());
    res.setHours(0, 0, 0, 0);
    res.setDate(res.getDate() - day + (day === 0 ? -6 : 1));
    return res;
  }

  async getHeatmap(endDate: Date) {
    endDate.setHours(23, 59, 59, 999);

    let startDate = new Date(endDate.getTime());
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 7 * 52);
    startDate = this.weekStart(startDate);

    const rows = await this.t()
      .where({ show_in_stats: true })
      .where('started_at', '>=', startDate)
      .where('started_at', '<=', endDate)
      .count('* as count')
      .groupByRaw('DATE(started_at)')
      .select<
        { count: string; date: Date }[]
      >(this.db.knex.raw('DATE(started_at) as date'));
    return {
      startDate,
      endDate,
      values: rows.map((r) => ({
        count: parseInt(r.count),
        date: r.date,
      })),
    };
  }

  async getTotals() {
    const players = Object.values(await this.players.findAll());
    players.sort((a, b) => a.id - b.id);

    const dateFrom = new Date();
    dateFrom.setHours(0, 0, 0, 0);
    dateFrom.setDate(dateFrom.getDate() - 30);

    const gameIds = await this.t().where({ show_in_stats: true }).pluck('id');
    const rows = await this.tp()
      .where('entered_at', '>=', dateFrom)
      .whereIn('game_id', gameIds);
    const byGame = rows.reduce(
      (all, r) => ({ ...all, [r.game_id]: [...(all[r.game_id] || []), r] }),
      {} as Record<number, GamePlayer[]>,
    );
    const scores = Object.values(byGame).map((players) => {
      const p = [...players];
      p.sort((a, b) => b.score - a.score);
      return p[0].player_id;
    });
    const wins = scores.reduce(
      (all, playerId) => ({
        ...all,
        [playerId]: (all[playerId] || 0) + 1,
      }),
      {} as Record<number, number>,
    );

    return {
      players: players.map((p) => {
        let icon: string | undefined;

        if (this.config.players.useIcons) {
          const [m1, m2] = p.model.split('/');
          icon = `/icons/${m1}/icon_${m2 || 'default'}.png`;
        }

        return {
          id: p.id,
          name: p.name,
          icon,
          wins: wins[p.id] || 0,
        };
      }),
    };
  }
}
