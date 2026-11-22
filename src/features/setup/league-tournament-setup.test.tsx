// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CreateLeagueTournament } from './create-league-tournament';
import { createLeagueTournamentAction } from '@/lib/actions';

vi.mock('@/lib/actions', () => ({ createLeagueTournamentAction: vi.fn() }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('league tournament setup', () => {
  it('creates a v2 campaign without asking for fixed player names', async () => {
    vi.mocked(createLeagueTournamentAction).mockResolvedValue({ ok: true, value: { id: 'new-id', inviteCode: 'A'.repeat(32) } });
    render(<CreateLeagueTournament />);
    expect(screen.queryByLabelText(/Player/)).toBeNull();
    fireEvent.change(screen.getByLabelText('Tournament title'), { target: { value: 'The autumn league' } });
    fireEvent.click(screen.getByRole('button', { name: /Create tournament/ }));
    await waitFor(() => expect(createLeagueTournamentAction).toHaveBeenCalledWith('The autumn league'));
    expect(await screen.findByLabelText('Tournament invite code')).toHaveProperty('value', 'A'.repeat(32));
    expect(screen.getByRole('link', { name: 'Open tournament' }).getAttribute('href')).toBe('/tournaments/new-id');
  });

  it('keeps the form available after a storage failure', async () => {
    vi.mocked(createLeagueTournamentAction).mockResolvedValue({ ok: false, code: 'UNAVAILABLE' });
    render(<CreateLeagueTournament />);
    fireEvent.click(screen.getByRole('button', { name: /Create tournament/ }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByLabelText('Tournament title')).toBeTruthy();
  });
});
