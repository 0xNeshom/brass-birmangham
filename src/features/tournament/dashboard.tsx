"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { completedCount, standings, tournamentStatus, validateNames, validatePlacements, type PlayerSlot, type Tournament } from "@/domain/tournament";
import "./tournament.css";

export interface DashboardProps {
  tournament: Tournament;
  onSave: (matchNumber: number, placements: PlayerSlot[], expectedVersion: number) => Promise<void>;
  onRename: (names: string[], expectedVersion: number) => Promise<void>;
  hero?: ReactNode;
  charts?: ReactNode;
  connection?: string;
  refreshing?: boolean;
  error?: string;
  onRefresh?: () => void;
}

type Editor = { kind: "result"; number: number; draft: string[]; baseVersion: number } | { kind: "names"; draft: string[]; baseVersion: number };
const ordinal = ["1st", "2nd", "3rd"];
const message = (error: unknown) => error instanceof Error ? error.message : "The change could not be saved. Please try again.";

export function Dashboard({ tournament, onSave, onRename, hero, charts, connection = "Connected", refreshing = false, error, onRefresh }: DashboardProps) {
  const results = standings(tournament);
  const count = completedCount(tournament);
  const complete = count === 10;
  const next = tournament.matches.find((match) => match.placements === null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [formError, setFormError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [pending, setPending] = useState(false);
  const [replay, setReplay] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const stale = !!editor && (editor.baseVersion !== tournament.version || conflict);
  const playerName = (slot: PlayerSlot) => tournament.players.find((player) => player.slot === slot)?.name ?? `Player ${slot}`;
  const persisted = editor?.kind === "result" ? tournament.matches.find((match) => match.number === editor.number)?.placements : null;

  useEffect(() => {
    const node = dialog.current;
    if (editor && node && !node.open) node.showModal();
    if (!editor && node?.open) node.close();
  }, [editor]);

  function open(value: Editor) {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setFormError("");
    setConflict(false);
    setEditor(value);
  }
  function close() {
    if (pending) return;
    setEditor(null);
    returnFocus.current?.focus();
  }
  function editMatch(number: number) {
    const match = tournament.matches.find((candidate) => candidate.number === number);
    open({ kind: "result", number, draft: match?.placements?.map(String) ?? ["", "", ""], baseVersion: tournament.version });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!editor || pending || stale) return;
    setFormError("");
    try {
      const values = editor.kind === "names" ? validateNames(editor.draft) : validatePlacements(editor.draft.map(Number), tournament.players);
      setPending(true);
      if (editor.kind === "names") await onRename(values as string[], editor.baseVersion);
      else await onSave(editor.number, values as PlayerSlot[], editor.baseVersion);
      setEditor(null);
      returnFocus.current?.focus();
    } catch (failure) {
      const text = message(failure);
      setFormError(text);
      if (/conflict|version|changed|stale/i.test(text)) setConflict(true);
    } finally {
      setPending(false);
    }
  }

  return <div className="tournament-dashboard">
    <header className="tournament-heading">
      <div><p className="eyebrow">Brass: Birmingham · Tournament ledger</p><h1>{tournament.title}</h1><p className="tournament-status"><span className="tournament-status-dot" />{tournamentStatus(tournament)} <span aria-hidden="true">/</span> {count} of 10 matches recorded</p></div>
      <div className="tournament-connection"><span>{refreshing ? "Refreshing ledger…" : connection}</span>{onRefresh && <button className="tournament-text-button" onClick={onRefresh} disabled={refreshing}>Refresh</button>}</div>
    </header>
    {error && <p className="error-message" role="alert">{error}</p>}
    {hero}
    <section className="tournament-progress" aria-label="Tournament progress"><div className="tournament-section-label"><span>Ten matches. One ledger.</span><span>{count * 10}% complete</span></div><ol>{tournament.matches.map((match) => <li key={match.number} className={match.placements ? "is-recorded" : match.number === next?.number ? "is-next" : ""}><span>{String(match.number).padStart(2, "0")}</span><span className="sr-only">{match.placements ? "Recorded" : match.number === next?.number ? "Next match" : "Upcoming"}</span></li>)}</ol></section>
    <section className="tournament-scorecards" aria-label="Player scores">{tournament.players.map((player) => {
      const result = results.find((row) => row.slot === player.slot)!;
      return <article className={`tournament-scorecard tournament-player-${player.slot}${count > 0 && result.rank === 1 ? " tournament-leading" : ""}`} key={player.slot}><div className="tournament-section-label"><span>Player {String(player.slot).padStart(2, "0")}</span><span>{count > 0 && result.rank === 1 ? complete ? "Winner" : "Leading" : `Rank ${result.rank}`}</span></div><h2>{player.name}</h2><div className="tournament-score"><strong>{result.points}</strong><span>points</span></div><div className="tournament-score-progress"><progress max={100} value={result.points} aria-label={`${player.name}: ${result.points} of 100 possible points`} /><span>{result.points} / 100 possible points</span></div><div className="tournament-player-details"><span>{result.firsts} first places</span><span>{result.average === null ? "—" : result.average.toFixed(1)} avg / match</span></div></article>;
    })}</section>
    {complete && <section className="tournament-completion" aria-labelledby="tournament-winner"><div className="tournament-ribbons" key={replay} aria-hidden="true"><i/><i/><i/></div><p className="eyebrow">The final entry · Tournament complete</p><h2 id="tournament-winner">{results.filter((row) => row.rank === 1).map((row) => row.name).join(" & ")}</h2><p>{results.filter((row) => row.rank === 1).length > 1 ? "Share the victory." : "Takes the honours."} Ten matches, recorded in brass.</p><div className="tournament-actions"><Link className="button" href="/tournaments/new">Begin the next tournament <span aria-hidden="true">↗</span></Link><button className="tournament-text-button" onClick={() => setReplay((value) => value + 1)}>Replay celebration</button></div></section>}
    <div className="tournament-ledger-layout">
      <section className="tournament-ledger panel" aria-labelledby="tournament-ledger-heading"><div className="tournament-panel-heading"><div><p className="eyebrow">The record book</p><h2 id="tournament-ledger-heading">Match ledger</h2></div><span className="tournament-counter">{String(count).padStart(2, "0")} / 10</span></div>
        {!complete && next && <div className="tournament-next"><div><span className="eyebrow">Next at the table</span><h3>Match {String(next.number).padStart(2, "0")}</h3><p>Enter the final order. Points follow: 10 / 5 / 0.</p></div><button className="button" onClick={() => editMatch(next.number)}>Record match {next.number} <span aria-hidden="true">＋</span></button></div>}
        <ol className="tournament-match-list">{tournament.matches.map((match) => <li key={match.number}><span className="tournament-match-number">{String(match.number).padStart(2, "0")}</span>{match.placements ? <><div className="tournament-podium">{match.placements.map((slot, index) => <span key={slot} className={`tournament-player-${slot}`}><b>{ordinal[index]}</b> {playerName(slot)} <small>{[10, 5, 0][index]} pts</small></span>)}</div><button className="tournament-text-button" aria-label={`Edit match ${match.number}`} onClick={() => editMatch(match.number)}>Edit <span aria-hidden="true">↗</span></button></> : <div className="tournament-unplayed"><span>{match.number === next?.number ? "Ready for the next chapter" : "Awaiting the table"}</span><small>{match.number === next?.number ? "Up next" : "Upcoming"}</small></div>}</li>)}</ol>
      </section>
      <aside className="tournament-standings panel" aria-labelledby="tournament-standings-heading"><div className="tournament-panel-heading"><div><p className="eyebrow">{complete ? "Final classification" : "As it stands"}</p><h2 id="tournament-standings-heading">The standings</h2></div></div><ol>{results.map((row) => <li key={row.slot} className={`tournament-player-${row.slot}`}><span className="tournament-rank">{String(row.rank).padStart(2, "0")}</span><div><strong>{row.name}</strong><small>{row.firsts} first · {row.seconds} second · {row.thirds} third</small></div><b>{row.points}<small>pts</small></b></li>)}</ol><p className="tournament-tiebreak">Ranked by total points, then first places, then second places. Equal records share a rank{complete ? " and first-ranked players share victory" : ""}.</p><button className="tournament-text-button" onClick={() => open({ kind: "names", draft: tournament.players.map((player) => player.name), baseVersion: tournament.version })}>Edit player names <span aria-hidden="true">↗</span></button><p className="tournament-footnote">Names belong to this tournament’s record.</p></aside>
    </div>
    <div className="tournament-statistics-link"><Link className="tournament-text-button" href={`/tournaments/${tournament.id}/statistics`}>Explore tournament statistics <span aria-hidden="true">↗</span></Link></div>
    {charts}
    <dialog className="tournament-dialog" ref={dialog} aria-labelledby="tournament-editor-heading" onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => { if (!pending) { setEditor(null); returnFocus.current?.focus(); } }}>
      {editor && <form onSubmit={submit} aria-busy={pending}><div className="tournament-panel-heading"><div><p className="eyebrow">{editor.kind === "names" ? "Tournament players" : "Enter the final order"} · Revision {editor.baseVersion}</p><h2 id="tournament-editor-heading">{editor.kind === "names" ? "Edit player names" : `Match ${String(editor.number).padStart(2, "0")}`}</h2></div><button type="button" className="tournament-close" aria-label="Close editor" disabled={pending} onClick={close}>×</button></div>
        <p className="muted">{editor.kind === "names" ? "Use three unique names, up to 40 characters each." : "Choose each player once. Saving records the complete podium."}</p>
        {editor.draft.map((value, index) => <div className="field" key={index}><label htmlFor={`tournament-field-${index}`}>{editor.kind === "names" ? `Player ${index + 1}` : `${ordinal[index]} place · ${[10, 5, 0][index]} points`}</label>{editor.kind === "names" ? <input id={`tournament-field-${index}`} value={value} disabled={pending} onChange={(event) => { const draft = [...editor.draft]; draft[index] = event.target.value; setEditor({ ...editor, draft }); }} /> : <select id={`tournament-field-${index}`} value={value} disabled={pending} onChange={(event) => { const draft = [...editor.draft]; draft[index] = event.target.value; setEditor({ ...editor, draft }); }}><option value="">Select a player</option>{tournament.players.map((player) => <option key={player.slot} value={player.slot} disabled={editor.draft.some((chosen, position) => position !== index && chosen === String(player.slot))}>{player.name}</option>)}</select>}</div>)}
        {stale && <div className="tournament-conflict" role="alert"><strong>The ledger has changed. Review before saving.</strong><p>Your draft is preserved above. Latest available record (revision {tournament.version}):</p><p>{editor.kind === "names" ? tournament.players.map((player) => player.name).join(" / ") : persisted ? persisted.map((slot, index) => `${ordinal[index]} ${playerName(slot)}`).join(" / ") : "No result recorded for this match."}</p><div className="tournament-actions">{onRefresh && <button type="button" className="button secondary" onClick={onRefresh} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh persisted record"}</button>}<button type="button" className="button secondary" disabled={refreshing || (conflict && editor.baseVersion === tournament.version)} onClick={() => { setEditor({ ...editor, baseVersion: tournament.version }); setConflict(false); setFormError(""); }}>I reviewed revision {tournament.version} — keep my draft</button></div>{conflict && editor.baseVersion === tournament.version && <small>Refresh to load the changed revision before continuing.</small>}</div>}
        {formError && <p id="tournament-form-error" className="error-message" role="alert">{formError}</p>}
        <div className="tournament-dialog-footer"><span>Changes take effect after the server confirms.</span><div className="tournament-actions"><button type="button" className="button secondary" onClick={close} disabled={pending}>Cancel</button><button type="submit" className="button" disabled={pending || stale}>{pending ? "Saving…" : editor.kind === "names" ? "Save names" : "Save result"}</button></div></div>
      </form>}
    </dialog>
  </div>;
}
