import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hashPassword, verifyPassword, temporaryPassword, uniqueId, validLoginId, validPassword, tokenHash } from '../auth/credentials.js';

const src=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('random account IDs and temporary credentials have appropriate shape',()=>{
  for(const role of ['student','teacher']) {
    const one=uniqueId(role),two=uniqueId(role);
    assert.match(one,/^HN-[GM]-[A-F0-9]{12}$/);
    assert.ok(validLoginId(one));
    assert.notEqual(one,two);
  }
  const a=temporaryPassword(),b=temporaryPassword();
  assert.ok(validPassword(a));
  assert.notEqual(a,b);
});

test('passwords are one-way and verified correctly',async()=>{
  const password='ujian-password-kuat-2026';
  const hash=await hashPassword(password);
  assert.match(hash,/^scrypt\$32768\$8\$1\$/);
  assert.ok(!hash.includes(password));
  assert.equal(await verifyPassword(password,hash),true);
  assert.equal(await verifyPassword('salah',hash),false);
  assert.equal(await verifyPassword(password,'invalid'),false);
  assert.notEqual(await hashPassword(password),hash);
  assert.notEqual(tokenHash('abc'),tokenHash('def'));
});

test('API has server-side permission checks and never stores plain text passwords',()=>{
  const api=src('auth/api.js');
  assert.match(api,/requireUser\(db,request,response\)/);
  assert.match(api,/user\.role!=='admin'/);
  assert.match(api,/user\.role==='guru'/);
  assert.match(api,/teacher_id=\$2 AND organization_id=\$3/);
  assert.match(api,/hashPassword\(password\)/);
  assert.match(api,/HttpOnly; SameSite=Lax/);
  assert.match(api,/ORIGIN_NOT_ALLOWED/);
  assert.match(api,/CHECKPOINT_CONFLICT/);
  assert.match(api,/state:'draft'/);
  assert.doesNotMatch(api,/password_hash\s*=\s*password/);
});

test('database contains separate teacher, student, session and mission records',()=>{
  const schema=src('auth/schema.sql');
  for(const name of ['hn_organizations','hn_users','hn_classes','hn_class_members','hn_sessions','hn_mission_progress','hn_audit'])
    assert.ok(schema.includes('CREATE TABLE IF NOT EXISTS '+name));
  assert.match(schema,/UNIQUE\(teacher_id,name,school_year\)/);
  assert.match(schema,/PRIMARY KEY\(student_id,mission_id\)/);
});

test('frontend protects dashboards and maintains per-user local practice storage',()=>{
  const page=src('index.html'),app=src('app.js'),client=src('auth-client.js');
  assert.match(page,/src="auth-client\.js"/);
  assert.match(app,/await window\.hnAuthorize\(page\)/);
  assert.match(client,/\/api\/auth\/session/);
  assert.match(src('student-activities.js'),/hikayat-nusantara-murid-v3-/);
  assert.match(src('student-learning-center.js'),/hikayat-nusantara-refleksi-v3-/);
  assert.match(src('student-activities.js'),/Import rekod latihan saya/);
});

test('server supports account API and keeps Misi 4 upload disabled',()=>{
  const server=src('server.js');
  assert.match(server,/handleApi\(request, response, pathname\)/);
  assert.match(server,/MISI4_BACKEND_NOT_CONFIGURED/);
  assert.match(server,/\/login\.html/);
});
