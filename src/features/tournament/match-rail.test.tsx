// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Tournament } from '@/domain/tournament';
import { MatchRail } from './match-rail';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function matches(completed = 0): Tournament['matches'] {
  return Array.from({ length: 10 }, (_, index) => ({
    number: index + 1,
    participants: null,
    placements: index < completed ? [1, 2, 3] : null,
    playedAt: index < completed ? '2026-11-22T10:00:00.000Z' : null,
  }));
}

it('opens a station and labels the first match as next at the start', () => {
  const scrollIntoView = vi.fn();
  const target = document.createElement('div');
  target.scrollIntoView = scrollIntoView;
  vi.spyOn(document, 'getElementById').mockReturnValue(target);
  render(<MatchRail matches={matches()} targetPrefix="league-match" />);

  expect(screen.getByRole('button', { name: 'Match 1, Next match' }).getAttribute('aria-current')).toBe('step');
  expect(screen.getByRole('button', { name: 'Match 2, Upcoming' })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Match 7, Upcoming' }));
  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
});

it('moves the locomotive and next status from saved match data', () => {
  const { container, rerender } = render(<MatchRail matches={matches(3)} targetPrefix="legacy-match" />);
  expect(screen.getByRole('button', { name: 'Match 4, Next match' }).getAttribute('aria-current')).toBe('step');
  expect(container.querySelector('.match-rail-train')?.getAttribute('style')).toContain('calc(30% + 4%)');

  rerender(<MatchRail matches={matches(4)} targetPrefix="legacy-match" />);
  expect(screen.getByRole('button', { name: 'Match 4, Recorded' })).toBeDefined();
  expect(screen.getByRole('button', { name: 'Match 5, Next match' }).getAttribute('aria-current')).toBe('step');
  expect(container.querySelector('.match-rail-train')?.getAttribute('style')).toContain('calc(40% + 4%)');
});

it('keeps the locomotive at the final station after all ten results are saved', () => {
  const { container } = render(<MatchRail matches={matches(10)} targetPrefix="league-match" />);
  expect(screen.getByRole('button', { name: 'Match 10, Recorded' }).getAttribute('aria-current')).toBeNull();
  expect(container.querySelector('.match-rail-train')?.getAttribute('style')).toContain('calc(90% + 4%)');
  expect(screen.getAllByRole('button', { name: /Recorded/ })).toHaveLength(10);
});
