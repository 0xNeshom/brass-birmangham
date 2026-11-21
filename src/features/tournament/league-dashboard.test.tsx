// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { makeTournament } from '@/domain/testing';
import { LeagueTournamentDashboard } from './league-dashboard';

const mocks = vi.hoisted(() => ({
  refresh: vi.fn().mockResolvedValue(undefined),
  push: vi.fn(),
  join: vi.fn().mockResolvedValue({ ok: true, value: 1 }),
  leave: vi.fn().mockResolvedValue({ ok: true, value: null }),
  participants: vi.fn().mockResolvedValue({ ok: true, value: null }),
  result: vi.fn().mockResolvedValue({ ok: true, value: null }),
  profile: vi.fn().mockResolvedValue({ ok: true, value: null }),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: vi.fn() }) }));
vi.mock('./provider', () => ({ useTournament: () => ({
  tournament: makeTournament([], { rulesVersion: 2, players: [
    { slot: 1, name: 'Ada', memberId: 'member-1' }, { slot: 2, name: 'Bea', memberId: 'member-2' },
    { slot: 3, name: 'Cy', memberId: 'member-3' }, { slot: 4, name: 'Dee', memberId: 'member-4' },
  ], participants: [[1, 2, 3, 4]] }),
  refresh: mocks.refresh, connection: 'Connected', refreshing: false, error: '',
}) }));
vi.mock('@/lib/actions', () => ({
  joinTournamentRosterAction: mocks.join, leaveTournamentRosterAction: mocks.leave,
  saveLeagueResultAction: mocks.result, selectMatchParticipantsAction: mocks.participants,
  setMemberProfileAction: mocks.profile,
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('shows an independent four-player result form and submits the versioned ranking', async () => {
  render(<LeagueTournamentDashboard currentUserId="member-1" initialDisplayName="Ada" />);
  const selects = screen.getAllByRole('combobox');
  for (const [index, value] of ['1', '2', '3', '4'].entries()) fireEvent.change(selects[index], { target: { value } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Record result' })[0]);
  await vi.waitFor(() => expect(mocks.result).toHaveBeenCalledWith('test-tournament', 1, [1, 2, 3, 4], 1));
});

it('does not permit a future match result to be submitted before the prior result', () => {
  render(<LeagueTournamentDashboard currentUserId="member-1" initialDisplayName="Ada" />);
  const selects = screen.getAllByRole('combobox');
  for (const [index, value] of ['1', '2', '3', '4'].entries()) fireEvent.change(selects[index], { target: { value } });
  const buttons = screen.getAllByRole('button', { name: 'Record result' });
  expect(buttons).toHaveLength(10);
  expect((buttons[0] as HTMLButtonElement).disabled).toBe(false);
  expect((buttons[1] as HTMLButtonElement).disabled).toBe(true);
});
