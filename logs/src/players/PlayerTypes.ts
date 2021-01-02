export interface Player {
  id: number;
  created_at: Date;
  updated_at: Date;
  name: string;
  model: string;
}

export type PlayerInsert = Omit<Player, 'id' | 'created_at' | 'updated_at'>;

export interface ParsedClientInfo {
  client_id: number;
  name: string;
  model: string;
  options: Record<string, string>;
}
