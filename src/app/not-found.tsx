import Link from 'next/link';
export default function NotFound() {
  return <main id="main" className="loading-page"><p className="eyebrow">Page not found</p><h1>This page isn’t in the ledger.</h1><p className="muted">The tournament may be unavailable to your account.</p><Link className="button" href="/">Return to tournament</Link></main>;
}
