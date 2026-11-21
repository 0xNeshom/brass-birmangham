import { describe, expect, it, vi } from 'vitest';
import { makeTournament } from '@/domain/testing';
import { decodeTournament, isUuid, listLeagueTournaments, readLeagueTournament } from './repository';
import type { Database } from './database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('remote snapshot boundary', () => {
  it('decodes valid legacy data without mutating it', () => {
    const tournament = makeTournament();
    expect(decodeTournament(tournament)).toEqual(tournament);
  });

  it('rejects partial or cross-slot podiums and skipped matches', () => {
    const tournament = makeTournament();
    tournament.matches[0].placements = [1, 1, 3];
    expect(() => decodeTournament(tournament)).toThrow();
    tournament.matches[0].placements = null;
    tournament.matches[1].placements = [1, 2, 3];
    expect(() => decodeTournament(tournament)).toThrow();
    expect(() => decodeTournament({})).toThrow();
  });

  it('decodes an empty v2 roster before the first four players join', () => {
    const tournament = makeTournament([], { rulesVersion: 2, players: [] });
    expect(decodeTournament(tournament)).toMatchObject({ rulesVersion: 2, players: [] });
  });

  it('retains global member identity and roster leave status without guessing legacy IDs', () => {
    const players = Array.from({ length: 5 }, (_, index) => ({
      slot: index + 1,
      name: `Player ${index + 1}`,
      memberId: `00000000-0000-4000-8000-${String(index + 20).padStart(12, '0')}`,
      joinedAt: '2026-01-01T00:00:00.000Z',
      leftAt: index === 4 ? '2026-02-01T00:00:00.000Z' : null,
    }));
    const snapshot = makeTournament([[1, 2, 3, 4]], { rulesVersion: 2, players });
    expect(decodeTournament(snapshot).players).toEqual(players);
    expect(makeTournament().players.every((player) => player.memberId === undefined)).toBe(true);
  });

  it('validates four selected participants and requires four unique placements for saved v2 results', () => {
    const tournament = makeTournament([[1, 2, 3, 4]], { rulesVersion: 2 });
    expect(decodeTournament(tournament).matches[0]).toMatchObject({ participants: [1, 2, 3, 4], placements: [1, 2, 3, 4] });
    tournament.matches[0].placements = [1, 2, 3];
    expect(() => decodeTournament(tournament)).toThrow();
    tournament.matches[0].placements = [1, 2, 3, 4];
    tournament.matches[0].participants = [1, 2, 3, 3];
    expect(() => decodeTournament(tournament)).toThrow();
  });

  it('uses the versioned RPCs for new-format reads and pages', async () => {
    const snapshot = makeTournament([], { rulesVersion: 2, players: [] });
    const rpc = vi.fn(async (name: string) => ({
      data: name === 'read_league_tournament' ? snapshot : { items: [snapshot], nextCursor: null },
      error: null,
    }));
    const client = { rpc } as unknown as SupabaseClient<Database>;
    const id = '00000000-0000-4000-8000-000000000001';
    expect(await readLeagueTournament(client, id)).toMatchObject({ rulesVersion: 2, players: [] });
    expect((await listLeagueTournaments(client)).items).toHaveLength(1);
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(['read_league_tournament', 'list_league_tournaments']);
  });

  it('rejects malformed IDs before database lookups', () => {
    expect(isUuid('bad')).toBe(false);
    expect(isUuid('00000000-0000-0000-0000-000000000001')).toBe(true);
  });
});
