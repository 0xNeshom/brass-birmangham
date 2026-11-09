'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="main" className="loading-page"><p className="eyebrow">A temporary interruption</p><h1>The ledger is unavailable.</h1><p className="muted">Your saved results are safe. Check your connection and try again.</p><button className="button" onClick={reset}>Try again</button></main>;
}
