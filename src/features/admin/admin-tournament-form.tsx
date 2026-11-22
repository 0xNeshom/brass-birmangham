'use client';

import { useActionState } from 'react';
import { createAdminTournamentInvite, type AdminTournamentState } from './actions';

const initialState: AdminTournamentState = {};

export function AdminTournamentForm() {
  const [state, action, pending] = useActionState(createAdminTournamentInvite, initialState);
  return <form action={action} aria-busy={pending}>
    <div className="field"><label htmlFor="admin-tournament-title">Tournament title</label><input id="admin-tournament-title" name="title" maxLength={80} required /></div>
    {state.error && <p className="error-message" role="alert">{state.error}</p>}
    <button className="button" disabled={pending}>{pending ? 'Creating…' : 'Create tournament and code'}</button>
    {state.code && <div role="status"><p>Share this code privately. It is shown only once.</p>
      <label className="field">Tournament invite code<input value={state.code} readOnly onFocus={(event) => event.currentTarget.select()} /></label>
      <p>Players can register with this code and will be added to this tournament roster.</p>
    </div>}
  </form>;
}
