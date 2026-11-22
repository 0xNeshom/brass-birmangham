'use client';

import { useState, type FormEvent } from 'react';
import { createLeagueTournamentAction } from '@/lib/actions';
import { LedgerError } from '@/lib/errors';
import Link from 'next/link';

export function CreateLeagueTournament() {
  const [title, setTitle] = useState('The Birmingham Series');
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{id:string;inviteCode:string}|null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (!title.trim() || Array.from(title.trim()).length > 80) { setError('Give this tournament a title between 1 and 80 characters.'); return; }
    setBusy(true);
    try {
      const result = await createLeagueTournamentAction(title.trim());
      if (!result.ok) throw new LedgerError(result.code);
      setCreated(result.value);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The tournament could not be created.'); setBusy(false); }
  }
  return <div className="setup-layout"><aside className="setup-aside"><p className="eyebrow">A new chapter</p><h1>Every empire<br/>begins here.</h1><p className="muted">Create a league tournament. Members join its roster independently, and every match chooses its own four players.</p><div className="rules"><div className="rule-row"><span>League membership</span><strong>Unlimited</strong></div><div className="rule-row"><span>Matches</span><strong>Ten, in order</strong></div><div className="rule-row"><span>Match participants</span><strong>Exactly four</strong></div><div className="rule-row"><span>Points by place</span><strong>10 / 5 / 0 / 0</strong></div></div></aside><section className="panel setup-form"><p className="eyebrow">The tournament register</p><h2>Open a new ledger</h2>{created ? <div role="status"><p>Tournament created. Share this code privately; it is shown only once.</p><div className="field"><label htmlFor="generated-tournament-code">Tournament invite code</label><input id="generated-tournament-code" value={created.inviteCode} readOnly onFocus={(event)=>event.currentTarget.select()} /></div><Link className="button" href={`/tournaments/${created.id}`}>Open tournament</Link></div> : <form onSubmit={submit}><div className="field"><label htmlFor="tournament-title">Tournament title</label><input id="tournament-title" value={title} maxLength={80} onChange={(event)=>setTitle(event.target.value)} required /></div>{error&&<p className="error-message" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy?'Opening the ledger…':'Create tournament and invite code'}</button><p className="muted" style={{fontSize:12,margin:'18px 0 0'}}>You can create multiple tournaments before any are finished.</p></form>}</section></div>;
}
