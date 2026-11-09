'use client';

import dynamic from 'next/dynamic';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './industrial-hero.module.css';

const IndustrialCanvas = dynamic(() => import('./industrial-canvas'), { ssr: false, loading: () => null });

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** A decorative scene: every tournament action stays outside its failure boundary. */
export function IndustrialHero({ completed = false }: { completed?: boolean }) {
  const host = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(true);
  const [mobile, setMobile] = useState(true);

  useEffect(() => {
    // Probe before importing/mounting Fiber, including browsers with WebGL disabled.
    const frame = requestAnimationFrame(() => {
      try {
        const probe = document.createElement('canvas');
        const context = probe.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
        setAvailable(Boolean(context));
        context?.getExtension('WEBGL_lose_context')?.loseContext();
      } catch { setAvailable(false); }
    });
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const small = matchMedia('(max-width: 640px)');
    const sync = () => { setReduced(motion.matches); setMobile(small.matches); setForeground(!document.hidden); };
    const initial = requestAnimationFrame(sync);
    motion.addEventListener('change', sync);
    small.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '40px' });
    if (host.current) observer.observe(host.current);
    return () => {
      cancelAnimationFrame(frame); cancelAnimationFrame(initial); observer.disconnect();
      motion.removeEventListener('change', sync); small.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  const running = visible && foreground && !reduced && !paused;
  return (
    <section ref={host} className={styles.hero} aria-label="Birmingham industrial landscape">
      <div className={styles.fallback} style={{ opacity: ready && enabled && !failed ? 0 : 1 }} aria-hidden="true" />
      {available && enabled && !failed && (
        <div className={styles.canvas} aria-hidden="true">
          <SceneBoundary onFailure={() => setFailed(true)}>
            <IndustrialCanvas running={running} mobile={mobile} onReady={() => setReady(true)} onFailure={() => setFailed(true)} />
          </SceneBoundary>
        </div>
      )}
      <div className={styles.shade} />
      <div className={styles.copy}>
        <p className={styles.label}>Birmingham · An industrial chronicle</p>
        <p className={styles.headline}>Industry.<br />Rivalry. <em>Legacy.</em></p>
        <p className={styles.caption}>{completed ? 'The ledger is closed. The legacy remains.' : 'Three industrialists. Ten matches. One enduring record.'}</p>
      </div>
      <div className={styles.controls}>
        {available && !failed && <button type="button" aria-pressed={enabled} onClick={() => setEnabled(!enabled)}>{enabled ? 'Disable 3D' : 'Enable 3D'}</button>}
        {available && enabled && !failed && !reduced && <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Resume motion' : 'Pause motion'}</button>}
      </div>
    </section>
  );
}
