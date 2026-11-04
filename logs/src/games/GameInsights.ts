import {
  GameInsights,
  InsightsBucket,
  InsightsPeriod,
  InsightsPlayer,
} from './GameTypes';

export interface InsightsGame {
  id: number;
  started_at: Date;
  scores: [number, number];
}

export interface InsightsKillCount {
  killer_id: number | null;
  player_id: number;
  weapon: number;
  count: number;
}

export interface InsightsFirstBlood {
  game_id: number;
  killer_id: number;
}

export interface InsightsItemCount {
  game_id: number;
  player_id: number;
  item: string;
  count: number;
}

export interface InsightsInput {
  period: InsightsPeriod;
  now: Date;
  rivals: [{ id: number; name: string }, { id: number; name: string }];
  // Oldest first.
  games: InsightsGame[];
  kills: InsightsKillCount[];
  firstBloods: InsightsFirstBlood[];
  items: InsightsItemCount[];
}

// meansOfDeath_t from the game code, with splash damage counted as its weapon.
const weaponNames: Record<number, string> = {
  1: 'Shotgun',
  2: 'Gauntlet',
  3: 'Machine gun',
  4: 'Grenade launcher',
  5: 'Grenade launcher',
  6: 'Rocket launcher',
  7: 'Rocket launcher',
  8: 'Plasma gun',
  9: 'Plasma gun',
  10: 'Railgun',
  11: 'Lightning gun',
  12: 'BFG',
  13: 'BFG',
  18: 'Telefrag',
};

export const edgeItems: Record<string, string> = {
  item_armor_body: 'More red armor',
  item_armor_combat: 'More yellow armor',
  item_health_mega: 'More mega health',
  weapon_railgun: 'More railgun pickups',
  weapon_rocketlauncher: 'More rocket launcher pickups',
};

export const insightsBucket = (period: InsightsPeriod): InsightsBucket =>
  ({ month: 'day', year: 'month', all: 'quarter' } as const)[period];

export function periodStart(period: InsightsPeriod, now: Date) {
  if (period === 'all') {
    return undefined;
  }
  const res = new Date(now.getTime());
  res.setHours(0, 0, 0, 0);
  if (period === 'month') {
    res.setDate(res.getDate() - 30);
  } else {
    // Twelve whole calendar months, so the first bucket isn't a partial one.
    res.setMonth(res.getMonth() - 11, 1);
  }
  return res;
}

function bucketStart(date: Date, bucket: InsightsBucket) {
  const res = new Date(date.getTime());
  res.setHours(0, 0, 0, 0);
  if (bucket !== 'day') {
    const month = res.getMonth();
    res.setMonth(bucket === 'month' ? month : month - month % 3, 1);
  }
  return res;
}

function nextBucket(date: Date, bucket: InsightsBucket) {
  const res = new Date(date.getTime());
  if (bucket === 'day') {
    res.setDate(res.getDate() + 1);
  } else {
    res.setMonth(res.getMonth() + (bucket === 'month' ? 1 : 3), 1);
  }
  return res;
}

function dateKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const winnerOf = ({ scores: [a, b] }: InsightsGame) =>
  a === b ? undefined : a > b ? 0 : 1;

function buildTimeline(input: InsightsInput, bucket: InsightsBucket) {
  const { games, now, period } = input;
  const first = periodStart(period, now) || games[0]?.started_at;
  if (!first) {
    return [];
  }

  const timeline: GameInsights['timeline'] = [];
  const byDate: Record<string, GameInsights['timeline'][number]> = {};
  const end = now.getTime();
  // Every bucket is listed, so a gap in play shows up as a gap in the chart.
  for (
    let date = bucketStart(first, bucket);
    date.getTime() <= end;
    date = nextBucket(date, bucket)
  ) {
    const entry = { date: dateKey(date), wins: [0, 0], draws: 0 };
    byDate[entry.date] = entry;
    timeline.push(entry);
  }

  games.forEach((game) => {
    const entry = byDate[dateKey(bucketStart(game.started_at, bucket))];
    const winner = winnerOf(game);
    if (entry && winner === undefined) {
      entry.draws += 1;
    } else if (entry && winner !== undefined) {
      entry.wins[winner] += 1;
    }
  });

  return timeline;
}

function buildWeapons({ kills, rivals }: InsightsInput) {
  const byWeapon: Record<string, number[]> = {};
  kills.forEach(({ count, killer_id, player_id, weapon }) => {
    const slot = rivals.findIndex((r) => r.id === killer_id);
    if (slot === -1 || killer_id === player_id) {
      return;
    }
    const name = weaponNames[weapon] || 'Other';
    byWeapon[name] = byWeapon[name] || [0, 0];
    byWeapon[name][slot] += count;
  });

  const total = (frags: number[]) => frags[0] + frags[1];
  return Object.entries(byWeapon)
    .map(([weapon, frags]) => ({ weapon, frags }))
    .sort((a, b) => total(b.frags) - total(a.frags));
}

function buildEdges({ firstBloods, games, items, rivals }: InsightsInput) {
  const winners: Record<number, number | undefined> = {};
  games.forEach((game) => {
    winners[game.id] = winnerOf(game);
  });

  const edges: GameInsights['edges'] = [];
  const addEdge = (label: string, holders: Record<number, number>) => {
    const decided = Object.entries(holders).filter(
      ([gameId]) => winners[Number(gameId)] !== undefined
    );
    edges.push({
      label,
      games: decided.length,
      wins: decided.filter(
        ([gameId, slot]) => winners[Number(gameId)] === slot
      ).length,
    });
  };

  const bloods: Record<number, number> = {};
  firstBloods.forEach(({ game_id, killer_id }) => {
    const slot = rivals.findIndex((r) => r.id === killer_id);
    if (slot !== -1) {
      bloods[game_id] = slot;
    }
  });
  addEdge('First blood', bloods);

  Object.entries(edgeItems).forEach(([item, label]) => {
    const counts: Record<number, [number, number]> = {};
    items
      .filter((i) => i.item === item)
      .forEach(({ count, game_id, player_id }) => {
        const slot = rivals.findIndex((r) => r.id === player_id);
        if (slot !== -1) {
          counts[game_id] = counts[game_id] || [0, 0];
          counts[game_id][slot] = count;
        }
      });

    const holders: Record<number, number> = {};
    Object.entries(counts).forEach(([gameId, [a, b]]) => {
      if (a !== b) {
        holders[Number(gameId)] = a > b ? 0 : 1;
      }
    });
    addEdge(label, holders);
  });

  const rate = (e: GameInsights['edges'][number]) =>
    e.games ? e.wins / e.games : -1;
  return edges.sort((a, b) => rate(b) - rate(a));
}

function buildPlayer(input: InsightsInput, slot: 0 | 1): InsightsPlayer {
  const { games, kills, rivals } = input;
  const { id, name } = rivals[slot];
  const scores = games.map((g) => g.scores[slot]);

  let streak = 0;
  let longestStreak = 0;
  let wins = 0;
  games.forEach((game) => {
    if (winnerOf(game) === slot) {
      wins += 1;
      streak += 1;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 0;
    }
  });

  const sum = (match: (k: InsightsKillCount) => boolean) =>
    kills.filter(match).reduce((all, k) => all + k.count, 0);

  return {
    id,
    name,
    wins,
    frags: sum((k) => k.killer_id === id && k.player_id !== id),
    deaths: sum((k) => k.player_id === id),
    worldDeaths: sum((k) => k.player_id === id && k.killer_id === null),
    suicides: sum((k) => k.player_id === id && k.killer_id === id),
    avgScore: scores.reduce((all, s) => all + s, 0) / (games.length || 1),
    bestScore: scores.length ? Math.max(...scores) : 0,
    longestStreak,
    currentStreak: streak,
  };
}

export function buildInsights(input: InsightsInput): GameInsights {
  const bucket = insightsBucket(input.period);
  const { games, period } = input;

  return {
    period,
    bucket,
    games: games.length,
    draws: games.filter((g) => winnerOf(g) === undefined).length,
    players: [buildPlayer(input, 0), buildPlayer(input, 1)],
    timeline: buildTimeline(input, bucket),
    weapons: buildWeapons(input),
    edges: buildEdges(input),
  };
}
