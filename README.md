# Brass League

A private Brass: Birmingham league with unlimited members, concurrent tournaments, and versioned rules. Existing three-player tournament history remains under rules version 1. New tournaments use four players per match, ten matches, and the current four-player scoring and tie-break rules.

## Local development

Requirements: Node.js 22+, npm, and a Supabase project or local Supabase instance.

```sh
cp .env.example .env.local
# Configure the three NEXT_PUBLIC_* values in .env.local.
npm run dev
```

Use `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` for local verification. `npm run test:db` and live browser tests require a disposable local Supabase instance. Never point destructive tests at production.

## Supabase configuration

The migration history is forward-only. Do not edit or replay `202611090001_tournament.sql`; the league and auth changes are in later migrations. Apply migrations only to the intended project after review and backup.

Keep public email signup disabled until the `before_user_created` Auth Hook is configured and its allow/deny and failure behavior have been tested in a disposable Supabase project. The checked-in `supabase/config.toml` configures the hook for local Supabase. Hosted projects require the corresponding Before User Created hook to be enabled in Authentication → Hooks, targeting `public.before_user_created`. The app also checks the allowlist on its server registration action, but the Auth hook is required to reject direct signup attempts before account creation.

Configure Authentication → URL Configuration with the canonical `NEXT_PUBLIC_SITE_URL`, and allow:

- `http://localhost:3000/auth/confirm`
- `http://localhost:3000/auth/callback`
- The matching deployed `/auth/confirm` and `/auth/callback` URLs.

Configure the email confirmation template to use the existing token-hash route:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard
```

SMTP must be configured before sending verification or recovery email. Preserve the existing invite and recovery template routes for legacy accounts.
In Authentication → Providers → Email, keep **Confirm email** enabled so the app cannot rely on a password-only signup to activate membership.

## Environment variables

| Variable | Purpose | Browser-visible |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key; RLS still applies | Yes |
| `NEXT_PUBLIC_SITE_URL` | Canonical auth redirect origin | Yes |
| `SUPABASE_SECRET_KEY` | Server-only privileged database operations | No |
| `BRASS_ADMIN_EMAIL` | Single administrator login name | No |
| `BRASS_ADMIN_PASSWORD_HASH` | scrypt hash, never plaintext | No |
| `BRASS_ADMIN_SESSION_SECRET` | At least 32 random bytes for session signing and rate-limit keys | No |
| `TEST_SUPABASE_URL`, `TEST_SUPABASE_PUBLISHABLE_KEY`, `TEST_SUPABASE_SECRET_KEY` | Disposable local integration tests only | No |

Generate the administrator password hash interactively with `npm run admin:hash`; it does not echo the password. Configure all admin and privileged variables only in trusted server environments. Never use a `NEXT_PUBLIC_` prefix for them or commit `.env.local`.

## Access and data safety

The administrator is separate from league membership. Admin pages and mutations validate a signed, HttpOnly, SameSite cookie against a server-side session record. The server actions use the privileged Supabase client; browser roles keep direct writes revoked. RLS checks active membership, and revocation changes the member row and allowlist status in one database transaction.

Registration is allowlist-gated, rate-limited, and requires email verification. Membership is activated by `activate_verified_membership()` only after Supabase confirms the email. Do not enable public signup if the Auth Hook is unavailable or failing open.

Database tests use isolated PostgreSQL-in-WASM fixtures and apply the checked-in migrations. Live Supabase tests require `BRASS_ALLOW_LOCAL_SERVICE_ROLE_TESTS=1`, an HTTP loopback URL on port 54321, and a matching `NEXT_PUBLIC_SUPABASE_URL`; remote URLs are rejected. They do not verify hosted Supabase Auth Hook execution, hosted SMTP delivery, multi-connection races, or production RLS configuration. Keep `supabase/config.toml` signup disabled until those environment-specific checks pass.

## Deployment

1. Run the local browser gate against the retained disposable stack with
   `BRASS_E2E_SUPABASE_WORKDIR=/path/to/disposable-workdir BRASS_E2E_PORT=3031 bash scripts/test-e2e-local.sh`.
   The runner checks the disposable project ID and loopback bindings before loading its keys.
2. Use a dedicated hosted Supabase project and Vercel Preview for release verification.
   Apply the two forward migrations, configure the Auth Hook, confirmation and recovery URLs,
   and SMTP. Use that project's own environment values and administrator credentials.
   With synthetic accounts, verify denied signup, email confirmation, access after revocation,
   a four-player tournament, and historical reads and corrections.
3. Before production promotion, take a database backup and verify the restore procedure.
   Confirm the production project and pending migration list. Apply only the reviewed forward
   migrations, then deploy the tested revision with the production URL and server-only secrets.
   Check sign-in and existing history before allowing registration. Enable registration only
   after confirming the deployed Auth Hook and real verification email delivery.
4. If authentication or data checks fail, disable signup and pause tournament writes during
   investigation. Keep the forward migrations recorded. Check schema compatibility before
   reverting the app deployment. Resolve schema issues with a reviewed forward fix, or restore
   the backup during a planned outage after accounting for writes made since the backup.
