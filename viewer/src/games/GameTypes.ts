export interface Game {
  id: number;
  started_at: Date;
  players: {
    id: number;
    name: string;
    model: string;
    score: number;
  }[];
}

export interface HeatmapData {
  startDate: string;
  endDate: string;
  values: {
    count: number;
    date: string;
  }[];
}

export interface TotalData {
  players: {
    id: number;
    name: string;
    model?: string;
    icon?: string;
    wins: number;
  }[];
}

export type InsightsPeriod = 'month' | 'year' | 'all';

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
  bucket: 'day' | 'month' | 'quarter';
  games: number;
  draws: number;
  players: InsightsPlayer[];
  timeline: { date: string; wins: number[]; draws: number }[];
  weapons: { weapon: string; frags: number[] }[];
  edges: { label: string; wins: number; games: number }[];
}
