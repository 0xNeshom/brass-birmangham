import Link from 'next/link';
import { Factory, BookOpen, ChartNoAxesCombined, LogOut, ArrowUpRight } from 'lucide-react';
import './shell.css';

export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="app-shell">
    <header className="masthead">
      <Link href="/" className="wordmark" aria-label="Brass Tournament home"><span className="brand-mark"><Factory size={25} strokeWidth={1.3}/></span><span>BRASS<small>TOURNAMENT LEDGER</small></span></Link>
      <nav aria-label="Main navigation"><Link href="/"><BookOpen size={16}/>Tournament</Link><Link href="/history"><ChartNoAxesCombined size={16}/>The archives</Link></nav>
      <form action="/auth/signout" method="post"><button className="signout" aria-label="Sign out"><LogOut size={17}/><span>Sign out</span></button></form>
    </header>
    <div className="club-line"><span>THE BIRMINGHAM PRIVATE LEAGUE</span><span>THREE PLAYERS <i/> TEN MATCHES</span></div>
    <main id="main" className="app-main">{children}</main>
    <footer className="app-footer"><span><Factory size={15}/> Built on industry. Decided at the table.</span><span>BRASS: BIRMINGHAM <ArrowUpRight size={12}/></span></footer>
  </div>;
}
