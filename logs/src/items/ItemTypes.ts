export interface Item {
  id: number;
  created_at: Date;
  game_id: number;
  player_id: number;
  item: string;
}

export type ItemInsert = Omit<Item, 'id' | 'created_at'>;

export interface ParsedItem {
  player_client_id: number;
  item: string;
}
