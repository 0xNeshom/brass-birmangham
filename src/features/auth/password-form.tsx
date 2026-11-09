'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase/browser';
import styles from './auth.module.css';

export function PasswordForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get('password') ?? '');
    if (password.length < 12) { setError('Choose a password with at least 12 characters.'); return; }
    if (password !== fields.get('confirmation')) { setError('The passwords do not match. Please check both fields.'); return; }
    setBusy(true); setError('');
    try {
      const { error } = await browserClient().auth.updateUser({ password });
      if (error) { setError('We could not update your password. Try a different password, or request a fresh recovery link if your session expired.'); return; }
      router.replace('/'); router.refresh();
    } catch { setError('We could not reach the league. Check your connection and try again.'); }
    finally { setBusy(false); }
  }
  return <><p className="eyebrow">YOUR PRIVATE ACCESS</p><h2>Set your password.</h2><p>Choose a password of at least 12 characters to secure your place at the table.</p><form className={styles.form} onSubmit={submit} aria-busy={busy}>
    <div className="field"><label htmlFor="password">New password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required /></div>
    <div className="field"><label htmlFor="confirmation">Confirm password</label><input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} required /></div>
    {error && <p className="error-message" role="alert">{error}</p>}<button className={`button ${styles.submit}`} disabled={busy}>{busy ? 'Saving password…' : 'Save password & enter'}</button>
  </form></>;
}
