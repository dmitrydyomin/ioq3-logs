export interface Game {
  id: number;
  started_at: Date;
  ended_at: Date | null;
  show_in_stats: boolean;
}

export interface GamePlayer {
  id: number;
  entered_at: Date;
  left_at: Date | null;
  game_id: number;
  player_id: number;
  score: number;
}

export interface ClientGame {
  id: number;
  started_at: Date;
  players: {
    id: number;
    name: string;
    model: string;
    score: number;
  }[];
}

export const insightsPeriods = ['month', 'year', 'all'] as const;

export type InsightsPeriod = (typeof insightsPeriods)[number];

export type InsightsBucket = 'day' | 'month' | 'quarter';

export interface InsightsPlayer {
  id: number;
  name: string;
  wins: number;
  frags: number;
  deaths: number;
  worldDeaths: number;
  suicides: number;
  avgScore: number;
  bestScore: number;
  longestStreak: number;
  currentStreak: number;
}

export interface GameInsights {
  period: InsightsPeriod;
  bucket: InsightsBucket;
  games: number;
  draws: number;
  players: InsightsPlayer[];
  timeline: { date: string; wins: number[]; draws: number }[];
  weapons: { weapon: string; frags: number[] }[];
  edges: { label: string; wins: number; games: number }[];
}
