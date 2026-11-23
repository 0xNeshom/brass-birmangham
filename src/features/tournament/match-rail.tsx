'use client';

import { useState } from 'react';
import { TrainFront } from 'lucide-react';
import type { Tournament } from '@/domain/tournament';
import './match-rail.css';

export function MatchRail({ matches, targetPrefix }: { matches: Tournament['matches']; targetPrefix: string }) {
  const completed = matches.filter((match) => match.placements !== null).length;
  const next = Math.min(completed + 1, 10);
  const [selected, setSelected] = useState(next);

  function openMatch(number: number) {
    setSelected(number);
    const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    document.getElementById(`${targetPrefix}-${number}`)?.scrollIntoView({ behavior, block: 'center' });
  }

  return <section className="match-rail" aria-label="Ten-match tournament route">
    <div className="match-rail-heading"><div><p className="eyebrow">Tournament route</p><h2>Ten stations to close the ledger</h2></div><span>{completed.toLocaleString('en-GB')} of 10 matches recorded</span></div>
    <div className="match-rail-track">
      <div className="match-rail-line" aria-hidden="true" />
      <TrainFront className="match-rail-train" aria-hidden="true" style={{ insetInlineStart: `calc(${(next - 1) * 10}% + 4%)` }} />
      <ol>{matches.map((match) => {
        const recorded = match.placements !== null;
        const isNext = match.number === next && !recorded;
        const status = recorded ? 'Recorded' : isNext ? 'Next match' : 'Upcoming';
        return <li key={match.number}>
          <button type="button" className={selected === match.number ? 'is-selected' : ''} aria-current={isNext ? 'step' : undefined} aria-label={`Match ${match.number.toLocaleString('en-GB')}, ${status}`} onClick={() => openMatch(match.number)}>
            <span className="match-rail-stop">{match.number.toLocaleString('en-GB', { minimumIntegerDigits: 2 })}</span>
            <span className="match-rail-state">{status}</span>
          </button>
        </li>;
      })}</ol>
    </div>
  </section>;
}
