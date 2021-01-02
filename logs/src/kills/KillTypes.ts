export interface Kill {
  id: number;
  created_at: Date;
  game_id: number;
  killer_id: number | null;
  player_id: number;
  weapon: number;
}

export type KillInsert = Omit<Kill, 'id' | 'created_at'>;

export interface ParsedKill {
  killer_client_id: number;
  player_client_id: number;
  weapon: number;
}
