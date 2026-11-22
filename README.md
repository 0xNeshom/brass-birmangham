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

Keep **Allow new users to sign up** disabled in Authentication → Sign In / Providers. Keep the Before User Created hook pointed to `public.before_user_created` as an extra safeguard. Apply the forward-only invite migrations in order. They keep direct Supabase signups blocked; the server creates accounts only after validating a per-tournament code.

Sign in at `/admin/login`. If the league has no v2 tournament yet, create the first tournament in `/admin/members`; this also generates its private registration code. Each tournament created by an active member gets its own code automatically. The creator sees the code once, and an administrator can replace it from the member panel. Players enter the tournament code, any email address, a display name, and their own password at `/register`. The database atomically creates the Auth account, league membership, profile, and roster entry, then sends the player to that tournament. No email approval or SMTP verification is used for registration.

Registration does not send email or establish ownership of the address. Email-based password recovery and legacy invite links still require email delivery. For environments that use those flows, keep Authentication → URL Configuration aligned with `NEXT_PUBLIC_SITE_URL` and allow the environment's `/auth/confirm` and `/auth/callback` routes.

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

Generate the administrator password hash interactively with `npm run admin:hash`. If writing it to a local Next.js dotenv file, escape each dollar sign as `\$`. Paste the raw hash in the Vercel environment settings. Configure privileged variables only in trusted server environments and keep them out of Git.

## Access and data safety

The administrator is separate from league membership. Admin pages and mutations validate a signed, HttpOnly, SameSite cookie against a server-side session record. The server actions use the privileged Supabase client; browser roles keep direct writes revoked. RLS checks active membership. Revocation denies future reads and writes by that member and preserves historical results.

Registration is rate limited. Each tournament has its own randomly generated reusable code; the database stores only its SHA-256 hash. A new account created with that code joins the global league and that tournament's roster atomically.

Database tests use isolated PostgreSQL-in-WASM fixtures. Live tests use a disposable Supabase stack with guarded loopback URLs and credentials. They do not verify the configuration of a hosted Supabase project.

## Deployment

1. Run the local browser gate against a disposable stack with
   `BRASS_E2E_SUPABASE_WORKDIR=/path/to/disposable-workdir BRASS_E2E_PORT=3031 bash scripts/test-e2e-local.sh`.
   The runner checks the disposable project ID and loopback bindings before loading its keys.
2. Use a dedicated hosted Supabase project and Vercel Preview for release verification.
   Apply the pending forward migrations and keep Supabase public signup disabled. Use that
   project's own environment values and administrator credentials. With synthetic accounts,
   verify code rotation, sign-in, access after revocation, four-player tournaments, and historical reads.
3. Before production promotion, take a database backup and verify the restore procedure.
   Confirm the production project and pending migration list. Apply only the reviewed forward
   migrations, then deploy the tested revision with the production URL and server-only secrets.
   Check sign-in and existing history before generating and sharing production tournament codes.
4. If authentication or data checks fail, replace the code without sharing it and pause tournament writes during
   investigation. Keep the forward migrations recorded. Check schema compatibility before
   reverting the app deployment. Resolve schema issues with a reviewed forward fix, or restore
   the backup during a planned outage after accounting for writes made since the backup.
