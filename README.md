# Brass Tournament

A private, shared Brass: Birmingham tournament ledger for three invited players. A tournament contains ten matches; first, second, and third place score 10, 5, and 0 points. Rankings use points, first-place finishes, then second-place finishes, with shared wins when all three values tie. Tournament history and corrections are retained.

## Requirements and local development

- Node.js 22 or newer and npm.
- A Supabase project for shared authentication and persistence. The UI deliberately shows a setup-required state when the public Supabase settings are missing; it never substitutes fixture data for real tournament records.

```sh
npm ci
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
# and NEXT_PUBLIC_SITE_URL in .env.local.
npm run dev
```

Open <http://localhost:3000>. `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, and `npm run test:db` are available. `npm run test:db` and the live Playwright workflow require a disposable local Supabase instance; they refuse non-local URLs and protect against pre-existing league data. Never point these destructive test suites at production.

## Supabase project setup

1. Create a Supabase project and copy its project URL and publishable (formerly anon) key into the environment variables below. Keep database migrations under `supabase/migrations` and apply them with the Supabase CLI (`supabase link --project-ref <project-ref>` followed by `supabase db push`) or the SQL editor. The initial migration creates the singleton private group and all tournament tables, constraints, functions, policies, and Realtime publication membership.
2. Confirm the `supabase_realtime` publication includes `public.tournaments`. The migration adds it when that publication exists; verify this in Database → Publications after migration.
3. In Authentication → Providers, disable public email signups. Invite the three participants from the Supabase dashboard (or Auth Admin API run only from a trusted administrative environment). Set a strong password policy and configure SMTP before sending invitations/recovery mail.
4. In Authentication → URL Configuration, set the Site URL to the canonical application origin. Add local (`http://localhost:3000/**`) and deployed callback URLs (`https://<your-domain>/auth/confirm`, `https://<your-domain>/auth/callback`) to the redirect allow list. Invite and recovery email templates should link through `/auth/confirm?token_hash={{ .TokenHash }}&type=invite` and `/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` respectively.
5. Add the three invited Auth user UUIDs to `public.group_members`, using the permanent group ID `00000000-0000-4000-8000-000000000001` and distinct `member_slot` values 1, 2, and 3. Run this statement as a trusted project administrator in the SQL editor; never expose an admin or service-role key in the app:

```sql
insert into public.group_members (group_id, user_id, member_slot) values
  ('00000000-0000-4000-8000-000000000001', '<auth-user-uuid-1>', 1),
  ('00000000-0000-4000-8000-000000000001', '<auth-user-uuid-2>', 2),
  ('00000000-0000-4000-8000-000000000001', '<auth-user-uuid-3>', 3);
```

The migration enables RLS on all application tables. Authenticated members can read their private group; direct browser table writes are revoked. Mutations go through authorization-checking RPC functions that validate membership, lock the group/tournament, and enforce expected versions. The app runtime uses only Supabase SSR cookies and the publishable key.

## Environment variables

| Variable | Use | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Browser-visible |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key | Browser-visible; RLS remains mandatory |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin used by auth redirects and sign-out origin checks | Browser-visible |
| `TEST_SUPABASE_URL` | Disposable local Supabase URL for integration/E2E tests | Test process only |
| `TEST_SUPABASE_PUBLISHABLE_KEY` | Local test client key | Test process only |
| `TEST_SUPABASE_SERVICE_ROLE_KEY` | Local test provisioning and cleanup only | Secret; never prefix with `NEXT_PUBLIC_` or deploy |

`.env.example` contains placeholders. For local development, `NEXT_PUBLIC_SITE_URL` should be `http://localhost:3000`; in a deployment it must match the canonical HTTPS origin exactly. Do not commit `.env.local` or put service-role credentials in Vercel application environment variables.

## Database migration and tests

The migration in `supabase/migrations/` is the source of truth. Make schema changes as forward migrations; do not edit an already-applied migration in a deployed project. Back up/export the database before applying changes and verify RLS and policies in the Supabase dashboard afterward.

For database integration tests, start a disposable local Supabase project, apply migrations, and set the `TEST_*` variables in `.env.local`. The script requires an empty database with no existing league members and creates temporary users/data; it cleans up only its own test records. The live Playwright journey additionally requires the application’s `NEXT_PUBLIC_*` Supabase settings to target the same local project. Without those settings, the live tests are skipped and live Supabase behavior is **not verified**.

Unit tests use Vitest and an isolated PGlite database where applicable. Browser configuration tests use Playwright Chromium. Set `PLAYWRIGHT_ALL_BROWSERS=1` to include Firefox and WebKit when their browser binaries and host libraries are available.

## Vercel deployment

1. Import this repository into Vercel and use the Next.js default build settings (`npm run build`). Node 22 is required.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` separately to Preview and Production environments. Use the matching Supabase project and exact canonical domain for each environment. Do not add `TEST_*` keys or any service-role key.
3. Apply the migration to the intended Supabase project, configure Auth Site URL/callback allow lists and SMTP, disable public signup, and provision the three member rows before sharing the site.
4. Deploy and smoke-test login, sign-out, read access from each invited account, one result save/edit, Realtime refresh, and unauthorized access denial. Keep an export/backup before production migrations and use a forward fix if a migration has been applied.

The application does not need cron jobs, custom WebSocket infrastructure, or paid asset storage. Vercel Hobby suitability and resource limits can change; verify the current plan restrictions for your deployment before relying on it for ongoing use.

## Security notes

Only the Supabase URL and publishable key are permitted in browser bundles. RLS is enabled for each application table, writes are RPC-only, and the functions check the authenticated membership. The service-role key bypasses RLS and must remain in trusted administration or disposable local test environments. Review Supabase Auth redirect allow lists and database policies whenever the deployment domain or membership model changes.
# brass-birmangham
