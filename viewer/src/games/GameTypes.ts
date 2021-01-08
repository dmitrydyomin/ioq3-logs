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
    icon?: string;
    wins: number;
  }[];
}
