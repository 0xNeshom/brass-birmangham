'use client';

import { useActionState } from 'react';
import { loginAdmin, type AdminLoginState } from './actions';
import styles from '@/features/auth/auth.module.css';

const initialState: AdminLoginState = { message: '' };

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(loginAdmin, initialState);
  return <>
    <p className="eyebrow">ADMINISTRATOR</p><h2>League controls.</h2><p>Sign in to manage approved email addresses and membership access.</p>
    <form className={styles.form} action={action} aria-busy={pending}>
      <div className="field"><label htmlFor="admin-email">Administrator email</label><input id="admin-email" name="email" type="email" autoComplete="username" maxLength={254} required /></div>
      <div className="field"><label htmlFor="admin-password">Password</label><input id="admin-password" name="password" type="password" autoComplete="current-password" maxLength={1024} required /></div>
      {state.message && <p className="error-message" role="alert">{state.message}</p>}
      <button className={`button ${styles.submit}`} disabled={pending}>{pending ? 'Please wait…' : 'Sign in'}</button>
    </form>
  </>;
}
