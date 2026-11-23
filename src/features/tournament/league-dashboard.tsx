'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { completedCount, standings, validateMatchParticipants, validatePlacements, type PlayerSlot } from '@/domain/tournament';
import { LedgerError } from '@/lib/errors';
import type { ActionResult } from '@/lib/errors';
import { joinTournamentRosterAction, leaveTournamentRosterAction, saveLeagueResultAction, selectMatchParticipantsAction, setMemberProfileAction } from '@/lib/actions';
import { useTournament } from './provider';
import { MatchRail } from './match-rail';
import './league-dashboard.css';

export function LeagueTournamentDashboard({ currentUserId, initialDisplayName }: { currentUserId: string; initialDisplayName: string | null }) {
  const { tournament, refresh, connection, refreshing, error } = useTournament();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName ?? '');
  const [profileDraft, setProfileDraft] = useState(initialDisplayName ?? '');
  const [selection, setSelection] = useState<Record<number, PlayerSlot[]>>({});
  const [placements, setPlacements] = useState<Record<number, PlayerSlot[]>>({});
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const rows = standings(tournament);
  const played = completedCount(tournament);
  const currentPlayer = tournament.players.find((player) => player.memberId === currentUserId && player.leftAt == null);
  const activeRoster = tournament.players.filter((player) => player.leftAt == null);
  const nextMatch = tournament.matches.find((match) => match.placements === null);

  async function perform(label: string, task: () => Promise<ActionResult<unknown>>) {
    setBusy(label); setFailure(''); setMessage('');
    try {
      const result = await task();
      if (!result.ok) throw new LedgerError(result.code ?? 'UNAVAILABLE');
      await refresh();
      router.refresh();
      setMessage('The ledger has been updated.');
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : 'The change could not be saved.');
    } finally { setBusy(''); }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await perform('profile', async () => {
      const result = await setMemberProfileAction(profileDraft);
      if (result.ok) setDisplayName(profileDraft.trim());
      return result;
    });
  }

  function saveSelection(number: number) {
    let slots: PlayerSlot[];
    try { slots = validateMatchParticipants(selection[number] ?? tournament.matches[number - 1]?.participants, activeRoster); }
    catch (cause) { setFailure(cause instanceof Error ? cause.message : 'Select four participants.'); return; }
    void perform(`participants-${number}`, () => selectMatchParticipantsAction(tournament.id, number, slots));
  }

  function saveResult(number: number) {
    const match = tournament.matches[number - 1];
    let order: PlayerSlot[];
    try {
      const participants = match?.participants;
      if (!participants) throw new Error('Choose the four participants first.');
      order = validatePlacements(placements[number] ?? match.placements, participants, 2);
    } catch (cause) { setFailure(cause instanceof Error ? cause.message : 'Enter a valid ranking.'); return; }
    void perform(`result-${number}`, () => saveLeagueResultAction(tournament.id, number, order, tournament.version));
  }

  return <div className="league-tournament">
    <header className="league-heading">
      <div><p className="eyebrow">Brass: Birmingham · League tournament</p><h1>{tournament.title}</h1><p>{played} of 10 matches recorded · {connection}</p></div>
      <div className="league-heading-actions"><span>{refreshing ? 'Refreshing…' : connection}</span><button type="button" className="button secondary" disabled={refreshing} onClick={() => void refresh()}>Refresh</button><Link className="button secondary" href="/">All tournaments</Link></div>
    </header>
    {(error || failure) && <p className="error-message" role="alert">{failure || error}</p>}
    {message && <p className="league-status" role="status">{message}</p>}

    <MatchRail matches={tournament.matches} targetPrefix="league-match" />

    <section className="panel league-profile"><div><p className="eyebrow">Your global profile</p><h2>{displayName || 'Set your display name'}</h2><p>This name is used when you join tournament rosters.</p></div>
      <form onSubmit={saveProfile}><label htmlFor="league-display-name">Display name</label><input id="league-display-name" value={profileDraft} maxLength={40} required onChange={(event) => setProfileDraft(event.target.value)} /><button className="button" disabled={!!busy}>{busy === 'profile' ? 'Saving…' : 'Save profile'}</button></form>
    </section>

    <section className="panel league-roster"><div className="league-section-heading"><div><p className="eyebrow">Tournament roster</p><h2>{activeRoster.length} member{activeRoster.length === 1 ? '' : 's'} joined</h2></div>
      {!currentPlayer ? <button className="button" disabled={!displayName || !!busy} onClick={() => void perform('join', () => joinTournamentRosterAction(tournament.id))}>{busy === 'join' ? 'Joining…' : 'Join tournament'}</button> : <button className="button secondary" disabled={played > 0 || !!busy} onClick={() => void perform('leave', () => leaveTournamentRosterAction(tournament.id))}>{busy === 'leave' ? 'Leaving…' : played > 0 ? 'Roster locked' : 'Leave tournament'}</button>}
    </div>
      {!displayName && <p className="muted">Set your display name before joining.</p>}
      {activeRoster.length === 0 ? <p className="muted">Members join independently. At least four are needed before recording a match.</p> : <ul className="league-roster-list">{activeRoster.map((player) => <li key={player.slot}><span>{player.name}</span>{player.memberId === currentUserId && <small>You</small>}</li>)}</ul>}
      {played > 0 && <p className="muted">The roster is locked after the first result is saved.</p>}
    </section>

    <section className="league-standings panel"><div className="league-section-heading"><div><p className="eyebrow">Appearances count</p><h2>Standings</h2></div><span>{played}/10</span></div>
      <div className="league-table-wrap"><table><thead><tr><th>Rank</th><th>Member</th><th>Points</th><th>1st</th><th>2nd</th><th>Played</th><th>Average</th></tr></thead><tbody>{rows.map((row) => <tr key={row.slot}><td>{row.rank}</td><th scope="row">{row.name}{tournament.players.find((player) => player.slot === row.slot)?.memberId === currentUserId ? ' (you)' : ''}</th><td>{row.points}</td><td>{row.firsts}</td><td>{row.seconds}</td><td>{row.appearances}</td><td>{row.average === null ? '—' : row.average.toFixed(1)}</td></tr>)}</tbody></table></div>
      {played === 10 && <p className="league-winner">Winner{rows.filter((row) => row.rank === 1).length > 1 ? 's' : ''}: {rows.filter((row) => row.rank === 1).map((row) => row.name).join(' & ')}</p>}
    </section>

    <section className="league-matches"><div className="league-section-heading"><div><p className="eyebrow">Four players · 10 / 5 / 0 / 0 points</p><h2>Match schedule</h2></div><span>Each match is selected separately</span></div>
      {tournament.matches.map((match) => {
        const selected = selection[match.number] ?? match.participants ?? [];
        const ranked = placements[match.number] ?? match.placements ?? [];
        const isNext = match.number === nextMatch?.number;
        const options = activeRoster.filter((player) => selected.includes(player.slot));
        const rankingIsComplete = ranked.length === 4 && new Set(ranked).size === 4
          && ranked.every((slot) => options.some((player) => player.slot === slot));
        return <article className="panel league-match" id={`league-match-${match.number}`} key={match.number}>
          <header><div><p className="eyebrow">Match {String(match.number).padStart(2, '0')}{isNext ? ' · Next up' : ''}</p><h3>{match.placements ? 'Result recorded' : 'Awaiting result'}</h3></div><strong>{match.placements ? 'Saved' : isNext ? 'Ready' : 'Upcoming'}</strong></header>
          {!match.placements && <fieldset disabled={!!busy}>
            <legend>Select exactly four roster members</legend>
            {activeRoster.length === 0 ? <p>Join this tournament to be available for selection.</p> : <div className="league-pick-list">{activeRoster.map((player) => <label key={player.slot}><input type="checkbox" checked={selected.includes(player.slot)} disabled={!selected.includes(player.slot) && selected.length >= 4} onChange={(event) => setSelection((current) => ({ ...current, [match.number]: event.target.checked ? [...selected, player.slot] : selected.filter((slot) => slot !== player.slot) }))} />{player.name}</label>)}</div>}
            <button className="button secondary" type="button" disabled={!!busy} onClick={() => saveSelection(match.number)}>{busy === `participants-${match.number}` ? 'Saving…' : 'Save participants'}</button>
          </fieldset>}
          {match.participants?.length === 4 && !match.placements && <div className="league-result-entry"><p>Rank these four participants. Only the next unrecorded match can be submitted.</p><div className="league-rank-selects">{[1, 2, 3, 4].map((place) => <label key={place}>{['1st · 10 points', '2nd · 5 points', '3rd · 0 points', '4th · 0 points'][place - 1]}<select value={ranked[place - 1] ?? ''} disabled={!!busy} onChange={(event) => setPlacements((current) => { const next = [...(current[match.number] ?? match.placements ?? [])]; next[place - 1] = Number(event.target.value); return { ...current, [match.number]: next }; })}><option value="">Choose member</option>{options.map((player) => <option key={player.slot} value={player.slot} disabled={ranked.some((slot, index) => index !== place - 1 && slot === player.slot)}>{player.name}</option>)}</select></label>)}</div>
            <button className="button" disabled={!isNext || !!busy || !rankingIsComplete} onClick={() => saveResult(match.number)}>{busy === `result-${match.number}` ? 'Saving…' : 'Record result'}</button>
          </div>}
          {match.placements && <div className="league-podium">{match.placements.map((slot, index) => <span key={slot}><b>{index + 1}.</b> {tournament.players.find((player) => player.slot === slot)?.name ?? `Member ${slot}`} <small>{[10, 5, 0, 0][index]} pts</small></span>)}</div>}
          {match.placements && <form className="league-correction" onSubmit={(event) => { event.preventDefault(); saveResult(match.number); }}><div className="league-rank-selects">{[1, 2, 3, 4].map((place) => <label key={place}>{place}{place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'} place<select value={ranked[place - 1] ?? ''} disabled={!!busy} onChange={(event) => setPlacements((current) => { const next = [...(current[match.number] ?? match.placements ?? [])]; next[place - 1] = Number(event.target.value); return { ...current, [match.number]: next }; })}><option value="">Choose member</option>{options.map((player) => <option key={player.slot} value={player.slot} disabled={ranked.some((slot, index) => index !== place - 1 && slot === player.slot)}>{player.name}</option>)}</select></label>)}</div><button className="button secondary" disabled={!!busy || !rankingIsComplete}>{busy === `result-${match.number}` ? 'Saving…' : 'Save correction'}</button></form>}
        </article>;
      })}
    </section>
  </div>;
}
