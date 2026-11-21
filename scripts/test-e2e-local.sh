#!/usr/bin/env bash
set -euo pipefail

readonly project_id='brass-auth-it-4dpoxpp2'
project_dir="${BRASS_E2E_SUPABASE_WORKDIR:-}"
if [[ -z "$project_dir" ]]; then
  project_dir="$(cat /tmp/brass-e2e-local-workdir)"
fi
readonly project_dir
readonly api_url='http://127.0.0.1:54321'
readonly mailpit_url='http://127.0.0.1:54324'

config="$project_dir/supabase/config.toml"
test -f "$config"
grep -Fq "project_id = \"$project_id\"" "$config"
grep -Eq '^enable_signup = true$' "$config"
grep -Fq '[auth.hook.before_user_created]' "$config"
grep -Eq '^enabled = true$' "$config"

status_env="$(npx supabase status --workdir "$project_dir" --output env 2>/dev/null)"
eval "$status_env"
test "$API_URL" = "$api_url"
test "$MAILPIT_URL" = "$mailpit_url"

assert_local_binding() {
  local container="$1" target_port="$2" host_port="$3"
  local actual_project binding
  actual_project="$(docker inspect --format '{{index .Config.Labels "com.supabase.cli.project"}}' "$container")"
  test "$actual_project" = "$project_id"
  binding="$(docker inspect --format "{{json (index .NetworkSettings.Ports \"$target_port\")}}" "$container")"
  node -e 'const b=JSON.parse(process.argv[1]);if(!Array.isArray(b)||b.length!==1||b[0].HostIp!=="127.0.0.1"||b[0].HostPort!==process.argv[2])process.exit(1)' "$binding" "$host_port"
}

assert_local_binding "supabase_kong_$project_id" '8000/tcp' '54321'
assert_local_binding "supabase_inbucket_$project_id" '8025/tcp' '54324'
port="${BRASS_E2E_PORT:-3000}"
if ! [[ "$port" =~ ^[1-9][0-9]{0,4}$ ]] || (( port > 65535 )); then
  printf '%s\n' 'BRASS_E2E_PORT must be a valid port number.' >&2
  exit 1
fi
if [[ -n "$(ss -Hltn "sport = :$port")" ]]; then
  printf 'Port %s is already occupied; refusing to reuse an existing app server.\n' "$port" >&2
  exit 1
fi

export BRASS_EXPECTED_LOCAL_PROJECT_ID="$project_id"
export BRASS_ALLOW_LOCAL_SERVICE_ROLE_TESTS=1
export TEST_SUPABASE_URL="$api_url"
export NEXT_PUBLIC_SUPABASE_URL="$api_url"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"
export SUPABASE_SECRET_KEY="$SECRET_KEY"
export TEST_SUPABASE_SECRET_KEY="$SECRET_KEY"
export TEST_SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"
export NEXT_PUBLIC_SITE_URL="http://localhost:$port"
export BRASS_E2E_PORT="$port"
export BRASS_E2E_PRODUCTION=1
export BRASS_E2E_RUN_ID="$(node -e 'process.stdout.write(require("node:crypto").randomUUID())')"
export BRASS_ADMIN_EMAIL='brass-e2e-admin@example.test'
export BRASS_E2E_ADMIN_PASSWORD="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')"
export BRASS_ADMIN_PASSWORD_HASH="$(node -e 'const c=require("node:crypto"),p=process.env.BRASS_E2E_ADMIN_PASSWORD,s=c.randomBytes(16).toString("hex"),h=c.scryptSync(p,s,64,{N:16384,r:8,p:1,maxmem:64*1024*1024}).toString("hex");process.stdout.write(`scrypt$16384$8$1$${s}$${h}`)')"
export BRASS_ADMIN_SESSION_SECRET="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')"

npm run build
npm run test:e2e -- tests/e2e/local-player-admin.spec.ts tests/e2e/local-member-journey.spec.ts
