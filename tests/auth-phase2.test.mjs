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
  assert.match(api,/canAdmin\(user\.role\)/);
  assert.match(api,/adminRoles=new Set\(\['admin','gkmp','panitia'\]\)/);
  assert.match(api,/\/api\/admin\/leaders/);
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

test('only three login portals while GKMP and Ketua Panitia share Admin',()=>{
  const login=src('login.html');
  const client=src('auth-client.js');
  const html=src('index.html');
  assert.equal((login.match(/data-role="/g)||[]).length,3);
  for(const role of ['murid','guru','admin']) assert.match(login,new RegExp('data-role="'+role+'"'));
  assert.doesNotMatch(login,/data-role="gkmp"|data-role="panitia"/);
  assert.match(login,/Ketua Panitia BM: pilih/);
  assert.match(client,/const roles=\['murid','guru','admin'\]/);
  assert.match(client,/dashboardRole=role=>adminLike\(role\)\?'admin':role/);
  assert.match(client,/dashboardRole\(result\.data\.user\?\.role\)!==chosen/);
  assert.equal((html.match(/class="portal-card /g)||[]).length,3);
  assert.match(html,/3 dashboard utama/);
});

test('class management supports confirmed deletion with roster preservation',()=>{
  const api=src('auth/api.js'),ui=src('account-ui.js');
  assert.match(api,/\/api\/classes\/delete/);
  assert.match(api,/CLASS_HAS_STUDENTS/);
  assert.match(api,/INSERT INTO hn_class_members\(class_id,student_id\) SELECT/);
  assert.match(ui,/Padam Kelas/);
  assert.match(ui,/deleteClassWithSafeguards/);
});

test('teacher supports bulk CSV pupil onboarding with private one-time passwords',()=>{
  const backend=src('auth/api.js'),ui=src('account-ui.js'),teacher=src('teacher-dashboard.js');
  assert.match(backend,/\/api\/teacher\/students\/bulk/);
  assert.match(backend,/LOGIN_ID_CONFLICT/);
  assert.match(backend,/bulk_register_students/);
  assert.match(backend,/must_change_password\) VALUES/);
  assert.match(ui,/readRosterCsv/);
  assert.match(ui,/downloadCredentialsCsv/);
  assert.match(ui,/hn-import-students/);
  assert.match(teacher,/id="hn-import-students"/);
});

test('teacher can reset forgotten pupil passwords for one class or selected pupil',()=>{
  const api=src('auth/api.js'),ui=src('account-ui.js'),teacher=src('teacher-dashboard.js');
  assert.match(api,/\/api\/teacher\/students\/reissue-temporary/);
  assert.match(api,/must_change_password/);
  assert.match(api,/reissue_initial_pupil_passwords/);
  assert.match(api,/reset_pupil_password/);
  assert.match(api,/reset_all_class_pupil_passwords/);
  assert.match(api,/mode==='student'/);
  assert.match(api,/must_change_password=true/);
  assert.match(ui,/Satu Kelas — Semua Murid Aktif/);
  assert.match(ui,/Murid Tertentu — Seorang Sahaja/);
  assert.match(ui,/studentId:target.id/);

  assert.match(ui,/openCredentialRecovery/);
  assert.match(ui,/Muat Turun Senarai Kata Laluan/);
  assert.match(teacher,/hn-reissue-credentials/);
});

test('server supports account API and keeps Misi 4 upload disabled',()=>{
  const server=src('server.js');
  assert.match(server,/handleApi\(request, response, pathname\)/);
  assert.match(server,/MISI4_BACKEND_NOT_CONFIGURED/);
  assert.match(server,/\/login\.html/);
});
