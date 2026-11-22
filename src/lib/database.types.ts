/** Public database contract, kept in sync with the checked-in migration. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
export type Database = {
  public: {
    Tables: {
      private_groups: Table<{ id: string; singleton: boolean; title: string; created_at: string }>;
      group_members: Table<{ group_id: string; user_id: string; member_slot: number | null; status: 'active' | 'revoked'; revoked_at: string | null; revoked_by: string | null }>;
      allowed_emails: Table<{ email_normalized: string; status: 'approved' | 'pending_verification' | 'active' | 'revoked'; auth_user_id: string | null; approved_by: string; created_at: string; updated_at: string }>;
      allowed_email_audit: Table<{ id: string; email_normalized: string; action: 'approved' | 'revoked' | 'activated' | 'reapproved'; actor: string; auth_user_id: string | null; occurred_at: string }>;
      admin_sessions: Table<{ id: string; created_at: string; expires_at: string; revoked_at: string | null }>;
      auth_rate_limits: Table<{ rate_key: string; window_started_at: string; attempts: number }>;
      member_profiles: Table<{ user_id: string; display_name: string; created_at: string; updated_at: string }>;
      tournaments: Table<{ id: string; group_id: string; title: string; version: number; rules_version: 1 | 2; created_at: string; completed_at: string | null; updated_at: string; last_editor: string | null }>;
      players: Table<{ tournament_id: string; slot: number; name: string; name_key: string; member_user_id: string | null; joined_at: string; left_at: string | null }>;
      matches: Table<{ tournament_id: string; number: number; played_at: string | null }>;
      match_results: Table<{ tournament_id: string; match_number: number; player_slot: number; position: number; points: number }>;
      match_participants: Table<{ tournament_id: string; match_number: number; player_slot: number; placement: number | null; points: number }>;
    };
    Views: { [_ in never]: never };
    Functions: {
      create_tournament: { Args: { p_title: string; p_names: string[] }; Returns: string };
      save_match_result: { Args: { p_tournament_id: string; p_match_number: number; p_placements: number[]; p_expected_version: number }; Returns: undefined };
      rename_players: { Args: { p_tournament_id: string; p_names: string[]; p_expected_version: number }; Returns: undefined };
      read_tournament: { Args: { p_id: string }; Returns: Json };
      list_tournaments: { Args: { p_cursor?: string | null; p_limit?: number }; Returns: Json };
      set_member_profile: { Args: { p_display_name: string }; Returns: undefined };
      create_league_tournament: { Args: { p_title: string; p_code_hash: string }; Returns: string };
      join_tournament_roster: { Args: { p_tournament_id: string }; Returns: number };
      leave_tournament_roster: { Args: { p_tournament_id: string }; Returns: undefined };
      select_match_participants: { Args: { p_tournament_id: string; p_match_number: number; p_player_slots: number[] }; Returns: undefined };
      save_league_match_result: { Args: { p_tournament_id: string; p_match_number: number; p_placements: number[]; p_expected_version: number }; Returns: undefined };
      read_league_tournament: { Args: { p_id: string }; Returns: Json };
      list_league_tournaments: { Args: { p_cursor?: string | null; p_limit?: number }; Returns: Json };
      before_user_created: { Args: { event: Json }; Returns: Json };
      activate_verified_membership: { Args: Record<PropertyKey, never>; Returns: string };
      rotate_tournament_invite: { Args: { p_tournament_id: string; p_code_hash: string; p_actor: string }; Returns: undefined };
      lookup_tournament_invite: { Args: { p_code_hash: string }; Returns: { invite_id: string; tournament_id: string }[] };
      admin_create_league_tournament: { Args: { p_title: string; p_code_hash: string; p_actor: string }; Returns: string };
      admin_list_league_tournaments: { Args: Record<PropertyKey, never>; Returns: { id: string; title: string; created_at: string; code_updated_at: string | null; can_invite: boolean }[] };
      admin_revoke_league_member: { Args: { p_user_id: string; p_actor: string }; Returns: undefined };
      admin_list_league_members: { Args: Record<PropertyKey, never>; Returns: { user_id: string; email: string | null; display_name: string | null; status: string; revoked_at: string | null }[] };
      admin_approve_email: { Args: { p_email: string; p_actor: string }; Returns: string };
      admin_revoke_email: { Args: { p_email: string; p_actor: string }; Returns: undefined };
      consume_auth_rate_limit: { Args: { p_rate_key: string; p_max_attempts: number; p_window_seconds: number }; Returns: boolean };
      create_admin_session: { Args: { p_expires_at: string }; Returns: string };
      validate_admin_session: { Args: { p_session_id: string }; Returns: boolean };
      revoke_admin_session: { Args: { p_session_id: string }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
