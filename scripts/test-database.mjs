/** Destructive integration test: disposable local Supabase only. Never production. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const url = process.env.TEST_SUPABASE_URL;
const serviceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.TEST_SUPABASE_PUBLISHABLE_KEY;
if (!url || !serviceKey || !publicKey) {
  throw new Error('Requires disposable local Supabase: TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY, TEST_SUPABASE_PUBLISHABLE_KEY. Apply migrations first.');
}
const target = new URL(url);
assert(['localhost','127.0.0.1','[::1]'].includes(target.hostname) && ['http:','https:'].includes(target.protocol), 'Only localhost Supabase is allowed');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url,serviceKey,options);
const anon = createClient(url,publicKey,options);
const group = '00000000-0000-4000-8000-000000000001';
const users = [];
function ok(result) { if(result.error) throw result.error; return result.data; }
function token(result, text) { assert(result.error?.message.includes(text), JSON.stringify(result.error)); }
try {
  // Refuse to alter any pre-existing ledger or invited accounts.
  assert.equal(ok(await admin.from('tournaments').select('id')).length,0,'Requires an empty disposable database');
  assert.equal(ok(await admin.from('group_members').select('user_id')).length,0,'Requires no pre-existing memberships');
  for(let slot=1;slot<=4;slot++) {
    const email = `db-${randomUUID()}@example.test`; const password = `${randomUUID()}Aa1!`;
    const user = ok(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;
    users.push(user);
    if(slot<=3) ok(await admin.from('group_members').insert({group_id:group,user_id:user.id,member_slot:slot}));
    const client = createClient(url,publicKey,options);
    ok(await client.auth.signInWithPassword({email,password}));
    user.client = client;
  }
  const [a,b,,outsider] = users.map(u=>u.client);
  assert((await anon.rpc('create_tournament',{p_title:'Unauthorized',p_names:['A','B','C']})).error);
  token(await outsider.rpc('list_tournaments',{}),'FORBIDDEN');
  assert((await a.from('tournaments').insert({group_id:group,title:'Direct'})).error);
  const args = {p_title:'Concurrent',p_names:['Ada','Bob','Cy']};
  const concurrent = await Promise.all([a.rpc('create_tournament',args),b.rpc('create_tournament',args)]);
  assert.equal(concurrent.filter(r=>!r.error).length,1);
  token(concurrent.find(r=>r.error),'ACTIVE_TOURNAMENT_EXISTS');
  const id = concurrent.find(r=>!r.error).data;
  const save = {p_tournament_id:id,p_match_number:1,p_placements:[1,2,3],p_expected_version:0};
  const saves = await Promise.all([a.rpc('save_match_result',save),b.rpc('save_match_result',{...save,p_placements:[3,2,1]})]);
  assert.equal(saves.filter(r=>!r.error).length,1); token(saves.find(r=>r.error),'VERSION_CONFLICT');
  token(await a.rpc('save_match_result',{...save,p_match_number:3,p_expected_version:1}),'VALIDATION');
  for(let n=2;n<=10;n++) ok(await a.rpc('save_match_result',{...save,p_match_number:n,p_expected_version:n-1}));
  const completed = ok(await a.rpc('read_tournament',{p_id:id})); assert(completed.completedAt);
  ok(await a.rpc('create_tournament',{...args,p_title:'Successor'}));
  ok(await b.rpc('save_match_result',{...save,p_expected_version:10,p_placements:[2,3,1]}));
  assert.equal(ok(await a.rpc('read_tournament',{p_id:id})).completedAt,completed.completedAt);
  assert.equal(ok(await outsider.from('tournaments').select('id')).length,0);
  console.log('Local Supabase integration passed: auth/RLS, RPC-only writes, concurrent create/save, lifecycle and historical correction.');
} finally {
  // This script only proceeds past the empty-database guard on a disposable DB.
  // Remove test-owned ledgers, then auth users, in FK order.
  const ids = users.filter(u=>typeof u==='object').map(u=>u.id);
  if(ids.length) {
    const tournaments = ok(await admin.from('tournaments').select('id'));
    for(const t of tournaments) {
      for(const table of ['match_results','matches','players']) ok(await admin.from(table).delete().eq('tournament_id',t.id));
      ok(await admin.from('tournaments').delete().eq('id',t.id));
    }
    for(const id of ids) ok(await admin.auth.admin.deleteUser(id));
  }
}
