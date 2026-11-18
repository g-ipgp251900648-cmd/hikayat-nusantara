import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('server assigns a scope only after a valid pupil session and injects it into mission root HTML',()=>{
  const api=read('auth/api.js'),server=read('server.js');
  assert.match(api,/export async function missionUserFromRequest/);
  assert.match(api,/user\.role==='murid'&&!user\.must_change_password/);
  assert.match(server,/missionUserFromRequest\(request\)/);
  assert.match(server,/missionRoute && !missionUser/);
  assert.match(server,/data-hn-account/);
  assert.match(server,/scopedMissionHtml\(fileContents,missionUser\.id\)/);
  assert.match(server,/scopedMissionHtml\(buf,missionUser\.id\)/);
  assert.match(server,/rel==='index\.html'/);
});

test('Misi 1 never reads or persists its original shared localStorage key',()=>{
  const source=read('mission-one-ai/src/App.tsx');
  assert.match(source,/const STORAGE_KEY = 'hikayat_nusantara_misi1_progress_v1'/);
  assert.match(source,/document\.documentElement\.dataset\.hnAccount/);
  assert.match(source,/accountStorageKey\(\)/);
  assert.match(source,/if \(!storageKey\) return/);
  assert.doesNotMatch(source,/localStorage\.getItem\(STORAGE_KEY\)/);
  assert.doesNotMatch(source,/localStorage\.setItem\(\s*STORAGE_KEY/);
});

test('Misi 2 stores all written story and flight records per authenticated pupil',()=>{
  const source=read('mission-two-ai/src/game/storage.ts');
  assert.match(source,/export function mission2ScopedKey/);
  assert.match(source,/document\.documentElement\.dataset\.hnAccount/);
  assert.match(source,/!mission2ScopedKey\(\)/);
  assert.match(source,/localStorage\.getItem\(mission2ScopedKey\(\)!/);
  assert.match(source,/localStorage\.setItem\(mission2ScopedKey\(\)!/);
  assert.match(source,/localStorage\.removeItem\(mission2ScopedKey\(\)!/);
  const parent=read('student-activities.js');
  assert.match(parent,/hikayat_misi2_portal_imported_flights_v2-"\+account\.id/);
  assert.match(parent,/hikayat_nusantara_misi2_state_v1:"\+account\.id/);
});

test('identities are not used as authentication proofs in browser APIs',()=>{
  const api=read('auth/api.js');
  assert.match(api,/const user=await findSession\(db,request\)/);
  assert.match(api,/const user=await requireUser\(db,request,response\)/);
  assert.match(api,/user\.role==='murid'/);
  assert.match(api,/WHERE student_id=\$1/);
});
