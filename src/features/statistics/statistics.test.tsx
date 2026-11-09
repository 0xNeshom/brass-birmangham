// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Statistics } from './statistics';
import { makeTournament } from '@/domain/testing';
afterEach(cleanup);
describe('interactive statistics',()=>{
  it('has no invented future scores and supports keyboard-compatible range inspection',()=>{
    const t=makeTournament();t.matches[0].placements=[1,2,3];t.matches[1].placements=[3,2,1];render(<Statistics tournament={t}/>);
    const input=screen.getByLabelText(/Inspect match/) as HTMLInputElement;
    expect(input.max).toBe('2');expect(input.value).toBe('2');fireEvent.change(input,{target:{value:'1'}});expect(input.getAttribute('aria-valuetext')).toBe('After match 1');expect(screen.getByText('Match 1: +10 points')).toBeDefined();
    expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(3);
  });
  it('provides an accessible empty state and numerical comparison',()=>{render(<Statistics tournament={makeTournament()} full/>);expect(screen.getByText(/blank ledger/)).toBeDefined();expect(screen.getAllByRole('table')).toHaveLength(2);expect(screen.getByLabelText(/Inspect match/).getAttribute('max')).toBe('0');});
});
