import { Service } from 'typedi';

import { PlayerRepository } from '../players/PlayerRepository';
import { Db } from '../services/Db';
import {
  buildInsights,
  edgeItems,
  InsightsFirstBlood,
  InsightsInput,
  InsightsItemCount,
  InsightsKillCount,
  periodStart,
} from './GameInsights';
import { GameInsights, InsightsPeriod } from './GameTypes';

@Service()
export class InsightsRepository {
  constructor(private db: Db, private players: PlayerRepository) {}

  private async getRivals(): Promise<InsightsInput['rivals'] | undefined> {
    // Taken over all time rather than per period, so that a player keeps the
    // same place and color whichever period is selected.
    const rows = await this.db
      .knex('game_players as gp')
      .join('games as g', 'g.id', 'gp.game_id')
      .where('g.show_in_stats', true)
      .groupBy('gp.player_id')
      .select('gp.player_id')
      .count('* as games')
      .orderBy('games', 'desc')
      .orderBy('gp.player_id')
      .limit(2);

    if (rows.length < 2) {
      return undefined;
    }

    const players = await this.players.findAll();
    const [a, b] = rows.map((r) => Number(r.player_id)).sort((x, y) => x - y);
    return [
      { id: a, name: players[a]?.name || '' },
      { id: b, name: players[b]?.name || '' },
    ];
  }

  async getInsights(
    period: InsightsPeriod,
    now = new Date()
  ): Promise<GameInsights> {
    const rivals = await this.getRivals();
    if (!rivals) {
      return buildInsights({
        period,
        now,
        rivals: [
          { id: 0, name: '' },
          { id: 0, name: '' },
        ],
        games: [],
        kills: [],
        firstBloods: [],
        items: [],
      });
    }

    const [a, b] = rivals;
    const knex = this.db.knex;
    const from = periodStart(period, now);

    // Games both rivals played. Comparing them only makes sense in those.
    const headToHead = knex('games as g')
      .join('game_players as a', 'a.game_id', 'g.id')
      .join('game_players as b', 'b.game_id', 'g.id')
      .where('a.player_id', a.id)
      .where('b.player_id', b.id)
      .where('g.show_in_stats', true)
      .whereNotNull('g.ended_at');
    if (from) {
      headToHead.where('g.started_at', '>=', from);
    }
    const gameIds = () => headToHead.clone().select('g.id');

    const [games, kills, firstBloods, items] = await Promise.all([
      headToHead
        .clone()
        .orderBy('g.started_at')
        .orderBy('g.id')
        .select<
          { id: number; started_at: Date; a: number; b: number }[]
        >('g.id', 'g.started_at', 'a.score as a', 'b.score as b'),
      knex('kills')
        .whereIn('game_id', gameIds())
        .groupBy('killer_id', 'player_id', 'weapon')
        .count('* as count')
        .select<InsightsKillCount[]>('killer_id', 'player_id', 'weapon'),
      knex('kills')
        .whereIn('id', function () {
          this.from('kills')
            .whereIn('game_id', gameIds())
            .whereNotNull('killer_id')
            .whereRaw('killer_id <> player_id')
            .groupBy('game_id')
            .min('id');
        })
        .select<InsightsFirstBlood[]>('game_id', 'killer_id'),
      knex('items')
        .whereIn('game_id', gameIds())
        .whereIn('item', Object.keys(edgeItems))
        .whereIn('player_id', [a.id, b.id])
        .groupBy('game_id', 'player_id', 'item')
        .count('* as count')
        .select<InsightsItemCount[]>('game_id', 'player_id', 'item'),
    ]);

    return buildInsights({
      period,
      now,
      rivals,
      games: games.map(({ id, started_at, a, b }) => ({
        id,
        started_at,
        scores: [a, b],
      })),
      kills: kills.map((k) => ({ ...k, count: Number(k.count) })),
      firstBloods,
      items: items.map((i) => ({ ...i, count: Number(i.count) })),
    });
  }
}
