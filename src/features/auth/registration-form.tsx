'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerPlayer, type RegistrationState } from './registration-actions';
import styles from './auth.module.css';

const initialState: RegistrationState = { message: '' };

export function RegistrationForm() {
  const [state, action, pending] = useActionState(registerPlayer, initialState);
  return <>
    <p className="eyebrow">LEAGUE REGISTRATION</p>
    <h2>Claim your place.</h2>
    <p>Register with an administrator-approved email. Membership begins after email verification.</p>
    <form className={styles.form} action={action} aria-busy={pending}>
      <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" maxLength={254} required /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required /></div>
      <div className="field"><label htmlFor="passwordConfirmation">Confirm password</label><input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required /></div>
      {state.message && <p className={state.sent ? styles.status : 'error-message'} role={state.sent ? 'status' : 'alert'}>{state.message}</p>}
      <button type="submit" className={`button ${styles.submit}`} disabled={pending}>{pending ? 'Submitting…' : 'Request verification'}</button>
    </form>
    <p className={styles.accessNote}>Already registered? <Link href="/login">Sign in</Link></p>
  </>;
}
