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
