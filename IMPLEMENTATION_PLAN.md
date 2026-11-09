# Brass Tournament — Approved Implementation Plan

## Product and decisions

Private, responsive Brass: Birmingham tournament companion for exactly three players and ten sequential matches. Points are 10/5/0; no early completion. Rank by points, then first places, then second places; equal standings share rank and victory after match ten. Three invited accounts have equal editing access. Previous and historical results remain editable; no deletion/clearing. Start a successor only when the current tournament finishes. Preserve tournament history and snapshot configurable player names per tournament.

## Architecture

Next.js App Router, React 19, TypeScript strict, Tailwind 4, Supabase Auth/Postgres/Realtime, Three.js with Fiber 9/Drei 10, and modular D3. Pin compatible versions in package-lock.json. Feature-oriented source: app, features, domain, components, lib, scene. Pure domain functions own validation, scoring, rankings, status and statistics. Server Components provide authenticated initial reads; client provider owns snapshots, refresh and mutation state. No global state dependency.

Routes: /login; /auth callback/confirm/password/recovery; / redirects to unfinished, latest completed or setup; /tournaments/new; /tournaments/[id]; /tournaments/[id]/statistics; /history.

Operations: create(title,names), save(tournament,match,ordered slots,expected version), rename(tournament,names,expected version), coherent read(tournament), paginated history(cursor). Names trimmed, nonempty, Unicode, case-insensitively unique, maximum 40 characters.

## Relational schema and security

private_groups permanent singleton; group_members keyed by group/user with member slots 1–3; tournaments with group, title, version and timestamps; players keyed by tournament/slot 1–3; matches keyed by tournament/number 1–10; match_results with unique player and finishing position per match and generated 10/5/0 points. Composite FKs enforce tournament ownership. Creation establishes exactly three players and ten matches atomically. One unfinished tournament per group using a partial unique index.

Mutations lock group then tournament, check authorization and expected version under lock, replace complete podiums atomically and increment version. First submissions must be the next match; corrections allowed anywhere. Completion only at ten valid results, preserving completion timestamp after corrections. Return explicit conflicts; never silently overwrite.

RLS on every table: authenticated members read their group; own membership rows avoid recursion. Revoke direct table mutation privileges; RPC-only writes. SECURITY DEFINER entrypoints verify auth.uid and target group, pin empty search_path, qualify objects, revoke PUBLIC/anon execute. Admin provisions three accounts/memberships; public signup disabled. No service-role key in application runtime. Cookie-based SSR sessions validated server-side.

Realtime tournament-version invalidation fetches coherent snapshots through one SQL read RPC; refresh on save, focus and reconnect. Subscribe to tournament inserts for successor/history invalidation too. Disconnected polling every 30 seconds while visible. Preserve unsaved forms and their opening version on background refresh or errors; conflicts require explicit review before retry. No offline writes; server acknowledgment before showing persisted scores.

## Design system and layout

“The Birmingham Tournament Ledger”: an engraved competition record with a brass miniature city. Coal #111210, surfaces #1B1D19/#252720, ivory #F2E8D5, stone #B7B09F, brass #C4A365, copper #CB9276, canal #88ADB2. Libre Baskerville headings, Barlow body, Barlow Condensed labels, all self-hosted. Thin borders, 4–8px corners, subtle grain and railway linework; no generic SaaS/glass/glow aesthetic. Check contrast; stable player colors plus labels/markers.

Tournament: AppShell → header → bounded industrial hero → ten-stop progress → three score cards → asymmetric standings and ten-match ledger → completion plaque. Mobile stacks with reachable next-match action and full-height editor. Native/accessible dialog: three unique placement selects, preview 10/5/0, prefilled edits, field errors, preserved inputs, focus restoration. Keyboard navigation, 44px controls and reduced motion.

Completion: winner/shared-winner plaque, final standings and transparent tiebreak explanation; short brass-ribbon reveal with replay, no repeated animation on refresh, instant recalculation on corrections.

## Charts and 3D

D3 scales/line/pointer calculations with React SVG: fixed 0–100 cumulative chart across match 0–10, actual results only; keyboard/touch inspection with cumulative and match points; finish-count grouped bars; statistical comparison table. Text/table equivalents for all charts, no invented future results or smoothing.

One isolated browser-only dynamically imported canvas with reserved dimensions and static original SVG fallback. Procedural factories, chimneys, canals, bridges, instanced railway sleepers, brass machinery. Shared low-poly geometry/materials, warm lighting/fog and local environment. No external runtime assets. <100 draw calls, <100k triangles; DPR ≤1.5 desktop/1 mobile. No bloom/reflections/volumetric smoke. One desktop shadow source, mobile simplified. Visible-only slow camera, pause when hidden/offscreen, demand rendering paused, adaptive quality/fallback. Ref-based frame updates, owned GPU cleanup, navigation memory check. Scene failure cannot block controls.

## Phases and gates

1. Discovery: inspect empty workspace, UI Skills frontend/3D categories, confirm product choices and tooling.
2. Foundation/design: save plan, scaffold compatible dependencies, establish tokens and responsive compositions for empty/active/completed states; verify typecheck/lint/build.
3. Domain: pure scoring/ranking/validation/statistics and passing unit tests.
4. UI: setup, dashboard, accessible match editor/history/responsive states; verify relevant interactions.
5. Experience: procedural 3D, fallback, D3 charts/reduced motion; measure performance and verify browser rendering.
6. Persistence: migrations, RLS/RPCs, authentication, types, synchronization; database integration tests.
7. Workflow QA: lifecycle, three browser sessions, corrections/conflicts, accessibility, cross-browser/responsive checks.
8. Delivery: passing build/lint/typecheck/tests; README, env example, Supabase and Vercel runbook.

Do not implement a later phase before relevant current checks pass. Fixtures only for tests/development, never an implicit production demo. Missing configuration produces an explicit error. No live deployment or credentials provisioned without external configuration.

## Acceptance and risks

Vitest: all six podium permutations, invalid/missing/duplicate/foreign players, 0–100 bounds, total 15×matches, score/tiebreak/shared ranks, nine vs ten matches, correction recalculation. DB: anon/nonmember denial, direct write denial, atomic rollback, skipped matches, simultaneous create/save conflicts, historical correction after successor. Playwright: complete ten-match lifecycle/history, responsive 360/390/768/desktop, keyboard form/chart use, session/network failures, three-session sync, no console/hydration errors. WebGL-disabled retains all features; reduced motion disables drift/reveal.

Targets mobile lab LCP ≤2.5s, CLS ≤0.1, ≥30fps reference mobile; document measured profile and unmet targets honestly. Risks: GPU/dependency budgets; concurrency and RLS gaps; Realtime outages; free-tier availability; SMTP delivery; history drift. Mitigations described above and tested at their boundaries.

Documentation: Node/install, local Supabase/migrations/tests, NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, site/auth redirects, invitations/SMTP/memberships/signup disabled, preview/production separation, backups/forward-fix migrations, Vercel Hobby personal deployment and smoke tests. No service-role runtime key, cron, paid storage or custom WebSocket server.

## Finalization status (2026-11-09)

### Completed in the finalization pass

- Resolved auth callback, confirmation, and sign-out redirects using `NEXT_PUBLIC_SITE_URL` as the canonical origin, with a localhost fallback for Next development servers bound to `0.0.0.0`.
- Added regression tests for wildcard-bind sign-out and configured canonical origins.
- Removed the temporary `/visual-qa` route and its production route entry.
- Added `README.md` with local setup, environment variables, Supabase migration and membership setup, auth/email configuration, RLS boundaries, testing, and Vercel instructions.
- Added a Playwright same-origin sign-out flow check.
- Verification so far: unit suite 54/54 passed; Chromium configuration E2E 7 passed, 1 skipped (live Supabase journey); responsive no-overflow checks passed at 360, 390, 768, and 1440 pixels; the configuration checks observed no page or console errors. The live tournament lifecycle is defined in `tests/e2e/live.spec.ts` but was skipped without disposable local Supabase credentials.

### Remaining gates and limitations

- Final checks passed: production build succeeded; lint and strict TypeScript typecheck succeeded; unit suite passed 54/54; Playwright Chromium passed 8 checks and skipped the one live Supabase journey. Build output contains no `/visual-qa` route.
- The dependency was pinned to TypeScript 5.9.3 and Next configured for its TypeScript API checker because Next's subprocess CLI parser returned empty `--showConfig` output in this environment. The production build now completes with its TypeScript check.
- Source/browser-bundle scan found no service-role key references in application or public assets. Migration inspection confirms RLS is enabled on all six data tables, authenticated reads are policy-gated, direct table mutation grants are revoked, and mutation RPCs use SECURITY DEFINER with empty search paths and authenticated-only execute grants.
- Live Supabase authentication, cross-session synchronization, RLS/RPC authorization, and complete ten-match lifecycle are not verified until run against a disposable local Supabase project with the documented `TEST_*` variables. `npm run test:db` was attempted and stopped at its required configuration guard because `.env.local` and a local Supabase instance are absent. No live Supabase instance was configured for this verification pass.
- Do not describe the deployment as production-ready until those external integration checks and deployed-domain authentication smoke tests pass.
