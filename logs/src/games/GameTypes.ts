export interface Game {
  id: number;
  started_at: Date;
  ended_at: Date | null;
}

export interface GamePlayer {
  id: number;
  entered_at: Date;
  left_at: Date | null;
  game_id: number;
  player_id: number;
  score: number;
}
