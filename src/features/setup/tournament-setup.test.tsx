// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TournamentSetup } from './tournament-setup';
const push=vi.fn();
vi.mock('next/navigation',()=>({useRouter:()=>({push,refresh:vi.fn()})}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
function fill(names:string[]){names.forEach((name,i)=>fireEvent.change(screen.getByLabelText(`Player ${i+1}`),{target:{value:name}}));}
describe('tournament setup',()=>{
  it('rejects duplicate names without attempting persistence',async()=>{const create=vi.fn();render(<TournamentSetup onCreate={create}/>);fill(['Ada','ada','James']);fireEvent.click(screen.getByRole('button',{name:/Begin/}));expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringMatching(/unique/));expect(create).not.toHaveBeenCalled();});
  it('preserves entries on storage failure and allows retry',async()=>{const create=vi.fn().mockRejectedValueOnce(new Error('Storage unavailable')).mockResolvedValueOnce('new-id');render(<TournamentSetup onCreate={create}/>);fill([' Ada ','James','Mary']);fireEvent.click(screen.getByRole('button',{name:/Begin/}));expect(await screen.findByRole('alert')).toHaveProperty('textContent','Storage unavailable');expect((screen.getByLabelText('Player 1') as HTMLInputElement).value).toBe(' Ada ');fireEvent.click(screen.getByRole('button',{name:/Begin/}));await waitFor(()=>expect(push).toHaveBeenCalledWith('/tournaments/new-id'));expect(create).toHaveBeenLastCalledWith('The Birmingham Series',['Ada','James','Mary']);});
});
