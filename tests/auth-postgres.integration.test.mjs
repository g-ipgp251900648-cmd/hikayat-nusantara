import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { hashPassword } from '../auth/credentials.js';

const dbUrl=process.env.HN_TEST_DATABASE_URL;
const port=17863;
const base='http://127.0.0.1:'+port;
const origin=base;
const makePassword=()=> 'Secure-Test-'+randomBytes(14).toString('hex');

async function api(path,{method='GET',body,cookie}={}) {
  const headers={};
  if(method!=='GET')headers.Origin=origin;
  if(body!==undefined)headers['Content-Type']='application/json';
  if(cookie)headers.Cookie=cookie;
  const response=await fetch(base+path,{
    method,headers,redirect:'manual',
    ...(body!==undefined?{body:JSON.stringify(body)}:{})
  });
  const data=await response.json().catch(()=>null);
  const issued=response.headers.get('set-cookie')?.split(';')[0]||null;
  return {status:response.status,data,cookie:issued};
}
async function signin(id,password) {
  const res=await api('/api/auth/login',{method:'POST',body:{id,password}});
  assert.equal(res.status,200,JSON.stringify(res.data));
  assert.match(res.cookie||'',/^hn_session=/);
  return res;
}
async function updatePassword(cookie,previous,next) {
  const r=await api('/api/auth/change-password',{method:'POST',cookie,body:{
    currentPassword:previous,newPassword:next
  }});
  assert.equal(r.status,200,JSON.stringify(r.data));
}
async function ready() {
  for(let i=0;i<60;i++){
    try {
      const response=await fetch(base+'/health');
      if(response.ok)return;
    }catch { /* wait for server to start */ }
    await sleep(150);
  }
  throw new Error('Server did not start');
}

test('PostgreSQL API: Admin creates teacher, teacher creates class and pupil; data stays isolated', {
  skip:!dbUrl,timeout:120000
},async()=>{
  const root=process.cwd();
  const adminId='HN-ADM-'+randomBytes(4).toString('hex').toUpperCase();
  const adminPassword=makePassword();
  const adminNewPassword=makePassword();
  const env={...process.env,
    DATABASE_URL:dbUrl,NODE_ENV:'test',PORT:String(port),
    HN_BOOTSTRAP_ADMIN_ID:adminId,
    HN_BOOTSTRAP_ADMIN_PASSWORD:adminPassword,
    HN_BOOTSTRAP_ADMIN_NAME:'Pentadbir Ujian',
    HN_BOOTSTRAP_ORGANIZATION:'Sekolah Ujian A'
  };
  const setup=spawnSync(process.execPath,['scripts/bootstrap-admin.mjs'],{
    cwd:root,env,encoding:'utf8',timeout:30000
  });
  assert.equal(setup.status,0,'Bootstrap failed; check CI PostgreSQL service');
  const server=spawn(process.execPath,['server.js'],{
    cwd:root,env:{...env,HN_BOOTSTRAP_ADMIN_PASSWORD:''},stdio:'ignore'
  });
  const {default:pg}=await import('pg');
  const pool=new pg.Pool({connectionString:dbUrl});
  try {
    await ready();
    const noSession=await api('/api/admin/teachers');
    assert.equal(noSession.status,401);
    const wrong=await api('/api/auth/login',{method:'POST',body:{id:adminId,password:'wrong-password'}});
    assert.equal(wrong.status,401);
    const admin=await signin(adminId,adminPassword);
    assert.equal(admin.data.user.role,'admin');
    assert.equal(admin.data.user.mustChangePassword,true);
    assert.equal((await api('/api/admin/overview',{cookie:admin.cookie})).status,403);
    await updatePassword(admin.cookie,adminPassword,adminNewPassword);
    assert.equal((await api('/api/admin/overview',{cookie:admin.cookie})).status,200);

    async function registerTeacher(name) {
      const r=await api('/api/admin/teachers',{
        method:'POST',cookie:admin.cookie,body:{name}
      });
      assert.equal(r.status,201,JSON.stringify(r.data));
      assert.match(r.data.teacher.login_id,/^HN-G-/);
      assert.ok(r.data.temporaryPassword.length>=12);
      return r.data;
    }
    // All leadership roles share Admin permissions within their organization.
    async function registerLeader(role,name) {
      const r=await api('/api/admin/leaders',{
        method:'POST',cookie:admin.cookie,body:{role,name}
      });
      assert.equal(r.status,201,JSON.stringify(r.data));
      assert.equal(r.data.leader.role,role);
      assert.match(r.data.leader.login_id,/^HN-(GK|KP)-/);
      assert.ok(r.data.temporaryPassword.length>=12);
      return r.data;
    }
    const gkmp=await registerLeader('gkmp','Guru Kanan Bahasa Melayu');
    const panitia=await registerLeader('panitia','Ketua Panitia Bahasa Melayu');
    const leadershipList=await api('/api/admin/leaders',{cookie:admin.cookie});
    assert.equal(leadershipList.data.leaders.length,2);
    const duplicate=await api('/api/admin/leaders',{method:'POST',cookie:admin.cookie,
      body:{role:'gkmp',name:'Guru Kanan Kedua'}});
    assert.equal(duplicate.status,409);
    const gkmpSession=await signin(gkmp.leader.login_id,gkmp.temporaryPassword);
    const panitiaSession=await signin(panitia.leader.login_id,panitia.temporaryPassword);
    assert.equal(gkmpSession.data.user.role,'gkmp');
    assert.equal(panitiaSession.data.user.role,'panitia');
    assert.equal((await api('/api/admin/overview',{cookie:gkmpSession.cookie})).status,403);
    await updatePassword(gkmpSession.cookie,gkmp.temporaryPassword,makePassword());
    await updatePassword(panitiaSession.cookie,panitia.temporaryPassword,makePassword());
    for(const session of [gkmpSession,panitiaSession]) {
      assert.equal((await api('/api/admin/overview',{cookie:session.cookie})).status,200);
      assert.equal((await api('/api/admin/teachers',{cookie:session.cookie})).status,200);
      assert.equal((await api('/api/admin/leaders',{cookie:session.cookie})).status,200);
    }
    const addedByGkmp=await api('/api/admin/teachers',{method:'POST',cookie:gkmpSession.cookie,
      body:{name:'Guru Daftar GKMP'}});
    assert.equal(addedByGkmp.status,201);
    const addedByPanitia=await api('/api/admin/teachers',{method:'POST',cookie:panitiaSession.cookie,
      body:{name:'Guru Daftar Panitia'}});
    assert.equal(addedByPanitia.status,201);
    const teacherA=await registerTeacher('Guru Amanah');
    const teacherB=await registerTeacher('Guru Bestari');
    const a=await signin(teacherA.teacher.login_id,teacherA.temporaryPassword);
    const b=await signin(teacherB.teacher.login_id,teacherB.temporaryPassword);
    assert.equal((await api('/api/teacher/classes',{cookie:a.cookie})).status,403);
    await updatePassword(a.cookie,teacherA.temporaryPassword,makePassword());
    await updatePassword(b.cookie,teacherB.temporaryPassword,makePassword());
    assert.equal((await api('/api/admin/teachers',{cookie:a.cookie})).status,404);

    const classA=await api('/api/teacher/classes',{method:'POST',cookie:a.cookie,body:{name:'5 Amanah',schoolYear:2026}});
    const classB=await api('/api/teacher/classes',{method:'POST',cookie:b.cookie,body:{name:'5 Bestari',schoolYear:2026}});
    assert.equal(classA.status,201);
    assert.equal(classB.status,201);
    const teacherAClasses=await api('/api/teacher/classes',{cookie:a.cookie});
    assert.deepEqual(teacherAClasses.data.classes.map(c=>c.name),['5 Amanah']);

    const forbiddenClass=await api('/api/teacher/students',{
      method:'POST',cookie:a.cookie,
      body:{name:'Murid Luar',classId:classB.data.class.id}
    });
    assert.equal(forbiddenClass.status,404);

    async function registerPupil(cookie,classId,name) {
      const r=await api('/api/teacher/students',{method:'POST',cookie,
        body:{name,classId}});
      assert.equal(r.status,201,JSON.stringify(r.data));
      assert.match(r.data.student.login_id,/^HN-M-/);
      return r.data;
    }
    const pupilA=await registerPupil(a.cookie,classA.data.class.id,'Murid Amanah');
    const pupilB=await registerPupil(b.cookie,classB.data.class.id,'Murid Bestari');
    const listA=await api('/api/teacher/students',{cookie:a.cookie});
    const listB=await api('/api/teacher/students',{cookie:b.cookie});
    assert.deepEqual(listA.data.students.map(x=>x.display_name),['Murid Amanah']);
    assert.deepEqual(listB.data.students.map(x=>x.display_name),['Murid Bestari']);

    const studentA=await signin(pupilA.student.login_id,pupilA.temporaryPassword);
    const studentB=await signin(pupilB.student.login_id,pupilB.temporaryPassword);
    await updatePassword(studentA.cookie,pupilA.temporaryPassword,makePassword());
    await updatePassword(studentB.cookie,pupilB.temporaryPassword,makePassword());
    const firstSave=await api('/api/student/progress/1',{
      method:'PUT',cookie:studentA.cookie,
      body:{revision:0,checkpoint:{draft:'Cerita peribadi A'}}
    });
    assert.equal(firstSave.status,200,JSON.stringify(firstSave.data));
    assert.equal(firstSave.data.state,'draft');
    const conflicting=await api('/api/student/progress/1',{
      method:'PUT',cookie:studentA.cookie,
      body:{revision:0,checkpoint:{draft:'Percubaan mengatasi'}}
    });
    assert.equal(conflicting.status,409);
    const changed=await api('/api/student/progress/1',{
      method:'PUT',cookie:studentA.cookie,
      body:{revision:1,checkpoint:{draft:'Cerita dikemas kini A'}}
    });
    assert.equal(changed.status,200);
    const mine=await api('/api/student/progress',{cookie:studentA.cookie});
    const other=await api('/api/student/progress',{cookie:studentB.cookie});
    assert.equal(mine.data.progress.length,1);
    assert.equal(mine.data.progress[0].checkpoint.draft,'Cerita dikemas kini A');
    assert.equal(other.data.progress.length,0);

    const teacherProgressA=await api('/api/teacher/progress',{cookie:a.cookie});
    const teacherProgressB=await api('/api/teacher/progress',{cookie:b.cookie});
    assert.equal(teacherProgressA.data.progress.length,1);
    assert.equal(teacherProgressB.data.progress.length,0);
    assert.equal(teacherProgressA.data.progress[0].state,'draft');
    assert.equal((await fetch(base+'/misi1/')).status,401);
    assert.equal((await fetch(base+'/misi1/',{headers:{Cookie:a.cookie}})).status,401);

    // An Admin, GKMP and Ketua Panitia have equivalent account-management powers.
    const protectedTeacher=await api('/api/admin/users/status',{
      method:'POST',cookie:a.cookie,body:{userId:teacherB.teacher.id,active:false}
    });
    assert.equal(protectedTeacher.status,404);
    const suspendedByGkmp=await api('/api/admin/users/status',{
      method:'POST',cookie:gkmpSession.cookie,
      body:{userId:addedByGkmp.data.teacher.id,active:false}
    });
    assert.equal(suspendedByGkmp.status,200);
    const deniedLogin=await api('/api/auth/login',{
      method:'POST',body:{id:addedByGkmp.data.teacher.login_id,password:addedByGkmp.data.temporaryPassword}
    });
    assert.equal(deniedLogin.status,401);
    const reactivatedByPanitia=await api('/api/admin/users/status',{
      method:'POST',cookie:panitiaSession.cookie,
      body:{userId:addedByGkmp.data.teacher.id,active:true}
    });
    assert.equal(reactivatedByPanitia.status,200);

    // Teachers with attached classes cannot be permanently deleted before transfer.
    const suspendB=await api('/api/admin/users/status',{method:'POST',cookie:admin.cookie,
      body:{userId:teacherB.teacher.id,active:false}});
    assert.equal(suspendB.status,200);
    const sessionAfterRevocation=await api('/api/auth/session',{cookie:b.cookie});
    assert.equal(sessionAfterRevocation.data.authenticated,false);
    const deletionBeforeTransfer=await api('/api/admin/users/delete',{
      method:'POST',cookie:admin.cookie,
      body:{userId:teacherB.teacher.id,confirmationId:teacherB.teacher.login_id}
    });
    assert.equal(deletionBeforeTransfer.status,409);
    assert.equal(deletionBeforeTransfer.data.error,'TRANSFER_TEACHER_CLASSES_FIRST');

    const adminClasses=await api('/api/admin/classes',{cookie:admin.cookie});
    assert.equal(adminClasses.status,200);
    assert.ok(adminClasses.data.classes.some(c=>c.id===classB.data.class.id));
    const transfer=await api('/api/admin/classes/transfer',{
      method:'POST',cookie:admin.cookie,
      body:{classId:classB.data.class.id,teacherId:teacherA.teacher.id}
    });
    assert.equal(transfer.status,200);
    const allA=await api('/api/teacher/classes',{cookie:a.cookie});
    assert.equal(allA.data.classes.length,2);
    const allStudentsA=await api('/api/teacher/students',{cookie:a.cookie});
    assert.ok(allStudentsA.data.students.some(p=>p.login_id===pupilB.student.login_id));
    const deletionAfterTransfer=await api('/api/admin/users/delete',{
      method:'POST',cookie:admin.cookie,
      body:{userId:teacherB.teacher.id,confirmationId:teacherB.teacher.login_id}
    });
    assert.equal(deletionAfterTransfer.status,200);
    assert.equal(deletionAfterTransfer.data.deleted,true);
    assert.equal((await api('/api/admin/teachers',{cookie:admin.cookie})).data.teachers.some(
      p=>p.id===teacherB.teacher.id),false);

    // Students need deactivation and exact login-ID confirmation to delete;
    // related checkpoints must be removed without touching other pupils.
    const studentList=await api('/api/admin/students',{cookie:admin.cookie});
    assert.equal(studentList.status,200);
    assert.ok(studentList.data.students.some(p=>p.id===pupilA.student.id&&p.progress_count===1));
    const activeStudentDelete=await api('/api/admin/users/delete',{
      method:'POST',cookie:admin.cookie,
      body:{userId:pupilA.student.id,confirmationId:pupilA.student.login_id}
    });
    assert.equal(activeStudentDelete.status,409);
    const studentSuspended=await api('/api/admin/users/status',{
      method:'POST',cookie:panitiaSession.cookie,
      body:{userId:pupilA.student.id,active:false}
    });
    assert.equal(studentSuspended.status,200);
    assert.equal((await api('/api/auth/session',{cookie:studentA.cookie})).data.authenticated,false);
    const incorrectConfirmation=await api('/api/admin/users/delete',{
      method:'POST',cookie:admin.cookie,
      body:{userId:pupilA.student.id,confirmationId:'HN-WRONG-123'}
    });
    assert.equal(incorrectConfirmation.status,400);
    const studentDeleted=await api('/api/admin/users/delete',{
      method:'POST',cookie:admin.cookie,
      body:{userId:pupilA.student.id,confirmationId:pupilA.student.login_id}
    });
    assert.equal(studentDeleted.status,200);
    const vanishedProgress=await pool.query('SELECT count(*)::int AS count FROM hn_mission_progress WHERE student_id=$1',[pupilA.student.id]);
    assert.equal(vanishedProgress.rows[0].count,0);
    const stillPresent=await api('/api/admin/students',{cookie:admin.cookie});
    assert.equal(stillPresent.data.students.some(p=>p.id===pupilA.student.id),false);
    assert.equal(stillPresent.data.students.some(p=>p.id===pupilB.student.id),true);

    // A separate school/organization admin cannot see School A teachers.
    const otherOrg=(await pool.query(
      'INSERT INTO hn_organizations(name) VALUES($1) RETURNING id',['Sekolah Ujian B']
    )).rows[0].id;
    const otherAdminId='HN-ADM-'+randomBytes(4).toString('hex').toUpperCase();
    const otherPassword=makePassword();
    await pool.query(
      "INSERT INTO hn_users(organization_id,login_id,display_name,password_hash,role,must_change_password) VALUES($1,$2,$3,$4,'admin',false)",
      [otherOrg,otherAdminId,'Pentadbir Sekolah B',await hashPassword(otherPassword)]
    );
    const otherAdmin=await signin(otherAdminId,otherPassword);
    const fromOtherOrg=await api('/api/admin/teachers',{cookie:otherAdmin.cookie});
    assert.equal(fromOtherOrg.status,200);
    assert.deepEqual(fromOtherOrg.data.teachers,[]);
    const crossOrgBlock=await api('/api/admin/users/status',{method:'POST',cookie:otherAdmin.cookie,
      body:{userId:teacherA.teacher.id,active:false}});
    assert.equal(crossOrgBlock.status,404);
    const crossOrgDelete=await api('/api/admin/users/delete',{method:'POST',cookie:otherAdmin.cookie,
      body:{userId:teacherA.teacher.id,confirmationId:teacherA.teacher.login_id}});
    assert.equal(crossOrgDelete.status,404);
    const outsideLeaders=await api('/api/admin/leaders',{cookie:otherAdmin.cookie});
    assert.equal(outsideLeaders.status,200);
    assert.deepEqual(outsideLeaders.data.leaders,[]);
    const otherStats=await api('/api/admin/overview',{cookie:otherAdmin.cookie});
    assert.equal(otherStats.data.stats.teachers,0);
    assert.equal(otherStats.data.stats.students,0);

    const logs=await pool.query('SELECT action,resource_type,actor_id FROM hn_audit ORDER BY id');
    assert.ok(logs.rows.some(x=>x.action==='create_teacher'));
    assert.ok(logs.rows.some(x=>x.action==='create_student'));
    assert.ok(logs.rows.some(x=>x.action==='deactivate_account'));
    assert.ok(logs.rows.some(x=>x.action==='permanently_delete_guru'));
    assert.ok(logs.rows.some(x=>x.action==='permanently_delete_murid'));
    assert.ok(logs.rows.some(x=>x.action==='login'&&x.actor_id===null),
      'Historical audit events survive account removal without retaining a user foreign key');
  }finally{
    server.kill('SIGTERM');
    await pool.end();
  }
});
