'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { browserClient } from '@/lib/supabase/browser';
import styles from './auth.module.css';

export function LoginForm({ linkError = false, recovery = false }: { linkError?: boolean; recovery?: boolean }) {
  const router = useRouter();
  const [recovering, setRecovering] = useState(recovery);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email') ?? '').trim();
    setBusy(true); setError(''); setSent(false);
    try {
      const client = browserClient();
      if (recovering) {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/auth/password` });
        if (error) { setError('We could not send a recovery link. Please try again shortly.'); return; }
        setSent(true);
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password: String(fields.get('password') ?? '') });
        if (error) { setError('Unable to sign in. Check your email and password, then try again.'); return; }
        router.replace('/'); router.refresh();
      }
    } catch { setError('We could not reach the league. Check your connection and try again.'); }
    finally { setBusy(false); }
  }
  return <><p className="eyebrow">MEMBERS’ ENTRANCE</p><h2>{recovering ? 'Recover your access.' : 'Open the ledger.'}</h2><p>{recovering ? 'Request a password reset link for your invited account.' : 'Sign in to record the next chapter of your rivalry.'}</p>
    {linkError && <p className="error-message" role="alert">This access link has expired or could not be verified. Request a new recovery link or contact your league administrator.</p>}
    <form className={styles.form} onSubmit={submit} aria-busy={busy}>
      <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></div>
      {!recovering && <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {sent && <p className={styles.status} role="status">If an invited account uses this email, a recovery link will arrive shortly. Check your inbox and spam folder.</p>}
      <button type="submit" className={`button ${styles.submit}`} disabled={busy}>{busy ? 'Please wait…' : recovering ? 'Send recovery link' : 'Enter the league'}<ArrowRight size={17} aria-hidden="true" /></button>
      <button type="button" className={styles.textButton} disabled={busy} onClick={() => { setRecovering(!recovering); setError(''); setSent(false); }}>{recovering ? 'Return to sign in' : 'Forgot your password?'}</button>
    </form><p className={styles.accessNote}>An invitation-only league for three players. Use the account invited by your league administrator.</p></>;
}
