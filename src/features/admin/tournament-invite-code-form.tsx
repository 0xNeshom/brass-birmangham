'use client';

import { useActionState } from 'react';
import { rotateTournamentInvite, type LeagueCodeState } from './actions';

const initialState: LeagueCodeState = {};

export function TournamentInviteCodeForm({ tournamentId, hasCode }: { tournamentId: string; hasCode: boolean }) {
  const action = rotateTournamentInvite.bind(null, tournamentId);
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} aria-busy={pending}>
      <p>Share this code privately with players joining this tournament. Replacing it invalidates the previous code.</p>
      <button className="button" disabled={pending}>
        {pending ? 'Generating…' : hasCode || state.code ? 'Replace tournament code' : 'Generate tournament code'}
      </button>
      {state.error && <p className="error-message" role="alert">{state.error}</p>}
      {state.code && <div role="status">
        <p>Copy this code now. It is shown only once.</p>
        <label className="field">Tournament code
          <input value={state.code} readOnly onFocus={(event) => event.currentTarget.select()} />
        </label>
      </div>}
    </form>
  );
}
