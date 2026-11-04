import { buildInsights, InsightsInput, periodStart } from './GameInsights';

const A = 1;
const B = 2;

const input = (data: Partial<InsightsInput>): InsightsInput => ({
  period: 'all',
  now: new Date(2026, 10, 4, 12),
  rivals: [
    { id: A, name: 'a' },
    { id: B, name: 'b' },
  ],
  games: [],
  kills: [],
  firstBloods: [],
  items: [],
  ...data,
});

const game = (id: number, a: number, b: number, month = 0, year = 2026) => ({
  id,
  started_at: new Date(year, month, 15, 20),
  scores: [a, b] as [number, number],
});

describe('buildInsights', () => {
  test('counts wins and draws, and a draw breaks a streak', () => {
    const res = buildInsights(
      input({
        games: [
          game(1, 5, 3),
          game(2, 6, 3),
          game(3, 4, 4),
          game(4, 7, 3),
          game(5, 1, 9),
          game(6, 2, 9),
        ],
      })
    );

    expect(res.games).toBe(6);
    expect(res.draws).toBe(1);
    expect(res.players[0]).toMatchObject({
      wins: 3,
      longestStreak: 2,
      currentStreak: 0,
      bestScore: 7,
    });
    expect(res.players[1]).toMatchObject({
      wins: 2,
      longestStreak: 2,
      currentStreak: 2,
      bestScore: 9,
    });
    expect(res.players[0].avgScore).toBeCloseTo(25 / 6);
  });

  test('tells frags, world deaths and suicides apart', () => {
    const res = buildInsights(
      input({
        kills: [
          { killer_id: A, player_id: B, weapon: 10, count: 7 },
          { killer_id: B, player_id: A, weapon: 6, count: 2 },
          { killer_id: null, player_id: A, weapon: 22, count: 3 },
          { killer_id: A, player_id: A, weapon: 7, count: 4 },
        ],
      })
    );

    expect(res.players[0]).toMatchObject({
      frags: 7,
      deaths: 9,
      worldDeaths: 3,
      suicides: 4,
    });
    expect(res.players[1]).toMatchObject({ frags: 2, deaths: 7 });
  });

  test('groups splash damage with its weapon and leaves out suicides', () => {
    const res = buildInsights(
      input({
        kills: [
          { killer_id: A, player_id: B, weapon: 6, count: 3 },
          { killer_id: A, player_id: B, weapon: 7, count: 2 },
          { killer_id: B, player_id: A, weapon: 10, count: 9 },
          { killer_id: B, player_id: A, weapon: 7, count: 1 },
          { killer_id: A, player_id: A, weapon: 7, count: 8 },
          { killer_id: null, player_id: A, weapon: 22, count: 8 },
          { killer_id: 3, player_id: A, weapon: 10, count: 8 },
          { killer_id: A, player_id: B, weapon: 23, count: 1 },
        ],
      })
    );

    expect(res.weapons).toEqual([
      { weapon: 'Railgun', frags: [0, 9] },
      { weapon: 'Rocket launcher', frags: [5, 1] },
      { weapon: 'Other', frags: [1, 0] },
    ]);
  });

  test('scores an edge by whether its holder won', () => {
    const res = buildInsights(
      input({
        games: [
          game(1, 9, 1),
          game(2, 9, 1),
          game(3, 1, 9),
          game(4, 5, 5),
          game(5, 9, 1),
        ],
        firstBloods: [
          { game_id: 1, killer_id: A },
          { game_id: 2, killer_id: B },
          { game_id: 3, killer_id: B },
          // A draw has no winner, so it doesn't count.
          { game_id: 4, killer_id: A },
          // Neither rival.
          { game_id: 5, killer_id: 3 },
        ],
        items: [
          { game_id: 1, player_id: A, item: 'item_armor_body', count: 3 },
          { game_id: 1, player_id: B, item: 'item_armor_body', count: 1 },
          { game_id: 2, player_id: A, item: 'item_armor_body', count: 2 },
          { game_id: 2, player_id: B, item: 'item_armor_body', count: 2 },
          { game_id: 3, player_id: A, item: 'item_armor_body', count: 1 },
          { game_id: 5, player_id: B, item: 'item_armor_body', count: 1 },
        ],
      })
    );

    const edge = (label: string) => res.edges.find((e) => e.label === label);
    expect(edge('First blood')).toEqual({
      label: 'First blood',
      wins: 2,
      games: 3,
    });
    // Game 2 is level on armor. A has the edge in 1 and 3, B in 5, and only
    // game 1 was won by the player with the edge.
    expect(edge('More red armor')).toEqual({
      label: 'More red armor',
      wins: 1,
      games: 3,
    });
  });

  test('puts the strongest edge first', () => {
    const res = buildInsights(
      input({
        games: [game(1, 9, 1), game(2, 1, 9)],
        firstBloods: [
          { game_id: 1, killer_id: A },
          { game_id: 2, killer_id: A },
        ],
        items: [
          { game_id: 1, player_id: A, item: 'item_health_mega', count: 1 },
        ],
      })
    );

    expect(res.edges[0].label).toBe('More mega health');
    expect(res.edges[1].label).toBe('First blood');
  });

  test('lists every month of the year, including those without games', () => {
    const res = buildInsights(
      input({
        period: 'year',
        games: [game(1, 5, 3, 0), game(2, 3, 5, 0), game(3, 4, 4, 3)],
      })
    );

    expect(res.bucket).toBe('month');
    expect(res.timeline).toHaveLength(12);
    expect(res.timeline[0].date).toBe('2025-12-01');
    expect(res.timeline[1]).toEqual({
      date: '2026-01-01',
      wins: [1, 1],
      draws: 0,
    });
    expect(res.timeline[2].wins).toEqual([0, 0]);
    expect(res.timeline[4].draws).toBe(1);
    expect(res.timeline[11].date).toBe('2026-11-01');
  });

  test('starts all time at the quarter of the first game', () => {
    const res = buildInsights(
      input({ games: [game(1, 5, 3, 4, 2025), game(2, 9, 3, 7, 2025)] })
    );

    expect(res.bucket).toBe('quarter');
    expect(res.timeline.map((t) => t.date)).toEqual([
      '2025-04-01',
      '2025-07-01',
      '2025-10-01',
      '2026-01-01',
      '2026-04-01',
      '2026-07-01',
      '2026-10-01',
    ]);
    expect(res.timeline[1].wins).toEqual([1, 0]);
  });

  test('uses days for the last 30 days', () => {
    const res = buildInsights(input({ period: 'month' }));

    expect(res.bucket).toBe('day');
    expect(res.timeline).toHaveLength(31);
    expect(res.timeline[0].date).toBe('2026-10-05');
    expect(res.timeline[30].date).toBe('2026-11-04');
  });

  test('handles a period without games', () => {
    const res = buildInsights(input({}));

    expect(res.games).toBe(0);
    expect(res.timeline).toEqual([]);
    expect(res.players[0]).toMatchObject({ avgScore: 0, bestScore: 0 });
    expect(res.edges.every((e) => e.games === 0)).toBe(true);
  });
});

describe('periodStart', () => {
  const now = new Date(2026, 10, 4, 12);

  test('has no limit for all time', () => {
    expect(periodStart('all', now)).toBeUndefined();
  });

  test('matches the 30 days of the win totals', () => {
    expect(periodStart('month', now)).toEqual(new Date(2026, 9, 5));
  });

  test('starts the year on the first of a month', () => {
    expect(periodStart('year', now)).toEqual(new Date(2025, 11, 1));
  });

  test('copes with months of different lengths', () => {
    expect(periodStart('year', new Date(2026, 11, 31))).toEqual(
      new Date(2026, 0, 1)
    );
  });
});
