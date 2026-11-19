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

test('every pupil dashboard greets only the authenticated account name',()=>{
  const html=src('index.html');
  const student=src('student-activities.js');
  const css=src('styles.css');
  for(const id of ['hn-student-top-name','hn-student-welcome',
      'hn-student-welcome-summary','hn-student-avatar','hn-student-attempt-summary']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(student,/const pupilName=String\(account\.name\|\|''\)/);
  assert.match(student,/welcome\.textContent='Selamat Datang, '\+pupilName\+'!'/);
  assert.match(student,/welcomeSummary\.textContent=pupilName\+'!'/);
  assert.match(student,/topName\.textContent=pupilName/);
  assert.doesNotMatch(student,/welcome\.innerHTML|topName\.innerHTML/);
  assert.match(css,/\.hn-student-welcome/);
  assert.match(student,/hn-student-attempt-summary/);
});

test('teacher and admin dashboards greet the authenticated name without HTML injection',()=>{
  const html=src('index.html');
  const ui=src('account-ui.js');
  const css=src('styles.css');
  for(const type of ['guru','admin']){
    for(const suffix of ['top-name','greeting','avatar']){
      assert.match(html,new RegExp('id="hn-'+type+'-'+suffix+'"'));
    }
  }
  assert.match(ui,/function renderRoleIdentity\(user\)/);
  assert.match(ui,/renderRoleIdentity\(u\)/);
  assert.match(ui,/greeting\.textContent=name\+'!'/);
  assert.match(ui,/label\.textContent=name/);
  assert.doesNotMatch(ui,/greeting\.innerHTML=name|label\.innerHTML=name/);
  assert.match(css,/\.hn-role-account-name/);
});
test('guide lists and teacher/admin charts are based on real saved progress',()=>{
  const api=src('auth/api.js'),ui=src('account-ui.js'),html=src('index.html');
  assert.match(api,/\/api\/admin\/roster/);
  assert.match(api,/WHERE c\.organization_id=\$1 AND u\.organization_id=\$1/);
  assert.match(api,/u\.active=true/);
  assert.match(ui,/function guidanceFor\(record\)/);
  assert.match(ui,/count>=2/);
  assert.match(ui,/score\/total<0\.6/);
  assert.match(ui,/Murid Perlu Bimbingan/);
  assert.match(ui,/Murid Belum Menyiapkan Semua Misi/);
  assert.match(ui,/Murid Belum Mula/);
  assert.match(ui,/renderAdminClassCharts/);
  assert.match(ui,/renderAdminIndividualCharts/);
  assert.match(ui,/class_id===cls\.id/);
  assert.match(ui,/return records\.filter/);
  assert.match(ui,/role','progressbar'|role','progressbar/); // accessible progress bars
  assert.match(html,/id="admin-kelas"/);
  assert.match(src('admin-dashboard.js'),/'admin-laporan'/);
  assert.doesNotMatch(ui,/Math\.random\(\).*completed/);
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
  assert.match(html,/3 ruang pengguna/);
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
  assert.match(ui,/Muat Turun ID & Kata Laluan Baharu/);
  assert.match(teacher,/hn-reissue-credentials/);
});

test('pupil practice synchronizes to Neon for teacher and all Admin dashboards',()=>{
  const client=src('student-activities.js'),api=src('auth/api.js'),ui=src('account-ui.js');
  assert.match(client,/\/api\/student\/progress\/.*i\+1/);
  assert.match(client,/kind:'practice-v1'/);
  assert.match(client,/Memuatkan kemajuan anda/);
  assert.match(client,/Tidak/);
  assert.match(api,/\/api\/admin\/progress/);
  assert.match(api,/\/api\/teacher\/progress/);
  assert.match(api,/formatMissionProgress/);
  assert.match(api,/canAdmin\(user\.role\)/);
  assert.match(ui,/renderMissionProgress/);
  assert.match(ui,/renderAdminProgressReport/);
  assert.match(ui,/bukan markah pentaksiran rasmi/i);
  assert.doesNotMatch(client,/body:JSON\.stringify\(\{revision:cloud\.revisions\[i\],checkpoint:state\}\)/);
});

test('teacher five connected learning modules are active, private and evidence-based',()=>{
  const page=src('index.html'),teacher=src('teacher-dashboard.js'),ui=src('teacher-learning-ui.js');
  const pupil=src('student-portfolio-ui.js'),api=src('auth/api.js'),schema=src('auth/schema.sql');
  const build=src('build.mjs'),server=src('server.js'),pkg=src('package.json');
  for(const id of ['guru-pbd','guru-analisis','guru-maklum-balas','guru-portfolio','guru-laporan']){
    assert.match(teacher,new RegExp(id));
  }
  for(const filename of ['teacher-learning-ui.js','student-portfolio-ui.js']){
    assert.match(page,new RegExp('src="'+filename.replace('.','\\.')+'"'));
    assert.ok(build.includes("'"+filename+"'"));
    assert.ok(server.includes('"/'+filename+'"'));
    assert.ok(pkg.includes('node --check '+filename));
  }
  for(const path of ['/api/teacher/learning','/api/teacher/pbd',
    '/api/teacher/feedback','/api/teacher/interventions',
    '/api/teacher/portfolio/review','/api/student/learning','/api/student/portfolio']){
    assert.ok(api.includes(path));
  }
  for(const table of ['hn_pbd_assessments','hn_pbd_assessment_history',
    'hn_teacher_feedback','hn_portfolio_entries','hn_teacher_interventions']){
    assert.ok(schema.includes('CREATE TABLE IF NOT EXISTS '+table));
  }
  assert.match(ui,/Sahkan Tahap Penguasaan/);
  assert.match(ui,/pertimbangan profesional/i);
  assert.match(ui,/Eksport CSV \(Excel\)/);
  assert.match(ui,/Cetak \/ Simpan PDF/);
  assert.match(ui,/Rancang Intervensi/);
  assert.match(ui,/Maklum Balas Guru/);
  assert.match(pupil,/Hantar Karya Bertulis/);
  assert.match(pupil,/window\.hnGetSession/);
  assert.match(ui,/window\.hnGetSession/);
  assert.match(ui,/Object\.values\(pages\)/);
  assert.doesNotMatch(ui,/const tp\s*=\s*.*lastScore/);
  assert.doesNotMatch(pupil,/localStorage\.getItem.*writtenStory/);
});

test('Teacher Settings has live profile/security/preferences/sessions modules',()=>{
  const page=src('index.html'),dash=src('teacher-dashboard.js');
  const ui=src('teacher-settings-ui.js'),api=src('auth/api.js');
  const schema=src('auth/schema.sql'),migration=src('auth/teacher-settings-migration.sql');
  const build=src('build.mjs'),server=src('server.js');
  const css=src('styles.css'),learning=src('teacher-learning-ui.js');
  assert.match(dash,/id="hn-teacher-settings-root"/);
  assert.match(page,/src="teacher-settings-ui\.js"/);
  assert.match(build,/'teacher-settings-ui\.js'/);
  assert.match(server,/\/teacher-settings-ui\.js/);
  for(const path of ['/api/teacher/settings','/api/teacher/settings/profile',
    '/api/teacher/settings/preferences','/api/teacher/settings/sessions/logout-others']){
    assert.ok(api.includes(path));
  }
  assert.match(schema,/CREATE TABLE IF NOT EXISTS hn_teacher_settings/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS hn_teacher_settings/);
  assert.match(ui,/Profil Guru/);
  assert.match(ui,/Keselamatan Akaun/);
  assert.match(ui,/Kelas Utama dan Keutamaan Paparan/);
  assert.match(ui,/Sesi dan Privasi Akaun/);
  assert.match(ui,/\/api\/auth\/change-password/);
  assert.match(ui,/applyAppearance/);
  assert.match(learning,/getDefaultClassId/);
  assert.match(css,/\.hn-guru-compact/);
  assert.match(css,/\.hn-guru-reduced-motion/);
  assert.match(css,/\.hn-guru-contrast/);
  assert.doesNotMatch(ui,/localStorage|sessionStorage|innerHTML/);
  assert.doesNotMatch(api,/token_hash:row\.token_hash/);
});

test('server supports secure account API and private Misi 4 upload proxy',()=>{
  const server=src('server.js');
  assert.match(server,/handleApi\(request, response, pathname\)/);
  assert.match(src('auth/api.js'),/handleMisi4Api/);
  assert.match(src('auth/misi4-media.js'),/VIDEO_STORAGE_NOT_CONFIGURED/);
  assert.match(server,/\/login\.html/);
});
