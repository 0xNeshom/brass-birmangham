// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CreateLeagueTournament } from './create-league-tournament';
import { createLeagueTournamentAction } from '@/lib/actions';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock('@/lib/actions', () => ({ createLeagueTournamentAction: vi.fn() }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('league tournament setup', () => {
  it('creates a v2 campaign without asking for fixed player names', async () => {
    vi.mocked(createLeagueTournamentAction).mockResolvedValue({ ok: true, value: 'new-id' });
    render(<CreateLeagueTournament />);
    expect(screen.queryByLabelText(/Player/)).toBeNull();
    fireEvent.change(screen.getByLabelText('Tournament title'), { target: { value: 'The autumn league' } });
    fireEvent.click(screen.getByRole('button', { name: /Create tournament/ }));
    await waitFor(() => expect(createLeagueTournamentAction).toHaveBeenCalledWith('The autumn league'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/tournaments/new-id'));
  });

  it('keeps the form available after a storage failure', async () => {
    vi.mocked(createLeagueTournamentAction).mockResolvedValue({ ok: false, code: 'UNAVAILABLE' });
    render(<CreateLeagueTournament />);
    fireEvent.click(screen.getByRole('button', { name: /Create tournament/ }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByLabelText('Tournament title')).toBeTruthy();
  });
});
