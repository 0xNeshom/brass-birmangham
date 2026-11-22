'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerPlayer, type RegistrationState } from './registration-actions';
import styles from './auth.module.css';

const initialState: RegistrationState = { message: '' };

export function RegistrationForm() {
  const [state, action, pending] = useActionState(registerPlayer, initialState);
  return <>
    <p className="eyebrow">TOURNAMENT REGISTRATION</p>
    <h2>Claim your place.</h2>
    <p>Enter the tournament code shared by its organizer. No email approval or verification is needed; the address is your sign-in name.</p>
    <form className={styles.form} action={action} aria-busy={pending}>
      <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" maxLength={254} required /></div>
      <div className="field"><label htmlFor="displayName">Display name</label><input id="displayName" name="displayName" type="text" autoComplete="nickname" maxLength={40} required /></div>
      <div className="field"><label htmlFor="leagueCode">Tournament code</label><input id="leagueCode" name="leagueCode" type="password" autoComplete="off" required /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required /></div>
      <div className="field"><label htmlFor="passwordConfirmation">Confirm password</label><input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} maxLength={1024} required /></div>
      {state.message && <p className={state.created ? styles.status : 'error-message'} role={state.created ? 'status' : 'alert'}>{state.message}</p>}
      <button type="submit" className={`button ${styles.submit}`} disabled={pending}>{pending ? 'Creating account…' : 'Create account and join tournament'}</button>
    </form>
    <p className={styles.accessNote}>Already registered? <Link href="/login">Sign in</Link></p>
  </>;
}
