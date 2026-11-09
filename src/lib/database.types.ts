/** Public database contract, kept in sync with the checked-in migration. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
export type Database = {
  public: {
    Tables: {
      private_groups: Table<{ id: string; singleton: boolean; title: string; created_at: string }>;
      group_members: Table<{ group_id: string; user_id: string; member_slot: number }>;
      tournaments: Table<{ id: string; group_id: string; title: string; version: number; created_at: string; completed_at: string | null; updated_at: string; last_editor: string | null }>;
      players: Table<{ tournament_id: string; slot: number; name: string; name_key: string }>;
      matches: Table<{ tournament_id: string; number: number; played_at: string | null }>;
      match_results: Table<{ tournament_id: string; match_number: number; player_slot: number; position: number; points: number }>;
    };
    Views: { [_ in never]: never };
    Functions: {
      create_tournament: { Args: { p_title: string; p_names: string[] }; Returns: string };
      save_match_result: { Args: { p_tournament_id: string; p_match_number: number; p_placements: number[]; p_expected_version: number }; Returns: undefined };
      rename_players: { Args: { p_tournament_id: string; p_names: string[]; p_expected_version: number }; Returns: undefined };
      read_tournament: { Args: { p_id: string }; Returns: Json };
      list_tournaments: { Args: { p_cursor?: string | null; p_limit?: number }; Returns: Json };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
