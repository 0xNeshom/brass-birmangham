import { Factory, KeyRound } from 'lucide-react';
import { IndustrialHero } from '@/scene/industrial-hero';
import { AfterRain } from '@/scene/after-rain';
import styles from './auth.module.css';

export function AuthFrame({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'sign-in' }) {
  const signIn = variant === 'sign-in';
  return <div className={`${styles.entrance}${signIn ? ` ${styles.afterRain}` : ''}`}>
    {signIn && <div className={styles.backdrop} aria-hidden="true"><AfterRain /></div>}
    <header className={styles.masthead}><span className={styles.brand}><Factory size={30} strokeWidth={1.2} /><span>BRASS<small>TOURNAMENT LEDGER</small></span></span><span className={styles.private}><KeyRound size={14} /> PRIVATE LEAGUE</span></header>
    <main id="main" className={styles.main}>
      <section className={styles.story} aria-label="The Birmingham private league"><p className="eyebrow">THE BIRMINGHAM PRIVATE LEAGUE</p><h1>A place at<br />the table.</h1><p className={styles.intro}>An enduring record of industry, ambition, and friendly rivalry.</p>{!signIn && <><IndustrialHero /><div className={styles.ledger}><span>∞ <small>LEAGUE MEMBERS</small></span><span>10 <small>MATCHES</small></span><span>01 <small>SHARED LEDGER</small></span></div></>}</section>
      <section className={styles.access} aria-label="League access">{children}</section>
    </main>
    <footer className={styles.footer}>BUILT ON INDUSTRY. DECIDED AT THE TABLE.<span>BRASS: BIRMINGHAM</span></footer>
  </div>;
}
