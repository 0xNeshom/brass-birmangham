import { Factory, KeyRound } from 'lucide-react';
import { IndustrialHero } from '@/scene/industrial-hero';
import styles from './auth.module.css';

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return <div className={styles.entrance}>
    <header className={styles.masthead}><span className={styles.brand}><Factory size={30} strokeWidth={1.2} /><span>BRASS<small>TOURNAMENT LEDGER</small></span></span><span className={styles.private}><KeyRound size={14} /> PRIVATE LEAGUE</span></header>
    <main id="main" className={styles.main}>
      <section className={styles.story} aria-label="The Birmingham private league"><p className="eyebrow">THE BIRMINGHAM PRIVATE LEAGUE</p><h1>A place at<br />the table.</h1><p className={styles.intro}>An enduring record of industry, ambition, and friendly rivalry.</p><IndustrialHero /><div className={styles.ledger}><span>03 <small>INDUSTRIALISTS</small></span><span>10 <small>MATCHES</small></span><span>01 <small>SHARED LEDGER</small></span></div></section>
      <section className={styles.access} aria-label="League access">{children}</section>
    </main>
    <footer className={styles.footer}>BUILT ON INDUSTRY. DECIDED AT THE TABLE.<span>BRASS: BIRMINGHAM</span></footer>
  </div>;
}
