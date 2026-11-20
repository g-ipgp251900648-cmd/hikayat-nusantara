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

async function api(path,{method='GET',body,cookie,clientIp}={}) {
  const headers={};
  if(method!=='GET')headers.Origin=origin;
  if(body!==undefined)headers['Content-Type']='application/json';
  if(cookie)headers.Cookie=cookie;
  if(clientIp)headers['X-Forwarded-For']=clientIp;
  const response=await fetch(base+path,{
    method,headers,redirect:'manual',
    ...(body!==undefined?{body:JSON.stringify(body)}:{})
  });
  const data=await response.json().catch(()=>null);
  const issued=response.headers.get('set-cookie')?.split(';')[0]||null;
  return {status:response.status,data,cookie:issued};
}
let testSignInCounter=0;
async function signin(id,password) {
  // CI makes many independent sign-ins in one test. Use synthetic client IPs
  // to exercise account permissions without exhausting the production IP limiter.
  const clientIp='192.0.2.'+(++testSignInCounter);
  const res=await api('/api/auth/login',{method:'POST',body:{id,password},clientIp});
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
    const teacherAPassword=makePassword();
    await updatePassword(a.cookie,teacherA.temporaryPassword,teacherAPassword);
    await updatePassword(b.cookie,teacherB.temporaryPassword,makePassword());
    assert.equal((await api('/api/admin/teachers',{cookie:a.cookie})).status,404);

    const classA=await api('/api/teacher/classes',{method:'POST',cookie:a.cookie,body:{name:'5 Amanah',schoolYear:2026}});
    const classB=await api('/api/teacher/classes',{method:'POST',cookie:b.cookie,body:{name:'5 Bestari',schoolYear:2026}});
    assert.equal(classA.status,201);
    assert.equal(classB.status,201);
    const teacherAClasses=await api('/api/teacher/classes',{cookie:a.cookie});
    assert.deepEqual(teacherAClasses.data.classes.map(c=>c.name),['5 Amanah']);

    const unauthorizedClassDeletion=await api('/api/classes/delete',{
      method:'POST',cookie:a.cookie,
      body:{classId:classB.data.class.id,confirmationName:'5 Bestari'}
    });
    assert.equal(unauthorizedClassDeletion.status,404);

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
    const emptyRosterBefore=await api('/api/admin/roster',{cookie:admin.cookie});
    assert.equal(emptyRosterBefore.status,200);
    assert.deepEqual(emptyRosterBefore.data.roster,[]);
    const pupilA=await registerPupil(a.cookie,classA.data.class.id,'Murid Amanah');
    const pupilB=await registerPupil(b.cookie,classB.data.class.id,'Murid Bestari');
    const listA=await api('/api/teacher/students',{cookie:a.cookie});
    const listB=await api('/api/teacher/students',{cookie:b.cookie});
    assert.deepEqual(listA.data.students.map(x=>x.display_name),['Murid Amanah']);
    assert.deepEqual(listB.data.students.map(x=>x.display_name),['Murid Bestari']);
    const adminRoster=await api('/api/admin/roster',{cookie:admin.cookie});
    assert.equal(adminRoster.status,200);
    assert.deepEqual(adminRoster.data.roster.map(r=>r.student_id).sort(),
      [pupilA.student.id,pupilB.student.id].sort());
    assert.ok(adminRoster.data.roster.some(r=>
      r.student_id===pupilA.student.id&&r.class_id===classA.data.class.id));
    assert.ok(adminRoster.data.roster.some(r=>
      r.student_id===pupilB.student.id&&r.class_id===classB.data.class.id));
    for(const leadership of [gkmpSession,panitiaSession]){
      assert.equal((await api('/api/admin/roster',{cookie:leadership.cookie})).status,200);
    }
    assert.equal((await api('/api/admin/roster',{cookie:a.cookie})).status,404);


    const studentA=await signin(pupilA.student.login_id,pupilA.temporaryPassword);
    const studentB=await signin(pupilB.student.login_id,pupilB.temporaryPassword);
    await updatePassword(studentA.cookie,pupilA.temporaryPassword,makePassword());
    await updatePassword(studentB.cookie,pupilB.temporaryPassword,makePassword());
    // Private Misi 2 cloud sync: A's phone can upload progress; a blank computer
    // cannot erase it. Teachers and other pupils cannot read A's written story.
    const misi2State=(completed=false)=>({
      version:1,lastUpdated:100,savedPhase:completed?'victory':'title',
      mode:'pengembara',quality:'high',reducedMotion:false,use2DFallback:false,
      alternativeLanguagePath:false,tutorialCompleted:completed,flightCompleted:completed,
      collectedPhrases:completed?['desa yang permai']:[],
      checkpointRecords:[0,1,2,3,4].map(i=>({
        checkpointIndex:i,firstAttemptCorrect:completed?true:null,
        masteredAfterCorrection:completed,attemptsUsed:completed?1:0
      })),
      flightScore:completed?500:0,
      lastRunStats:{timeRemaining:120,heartsRemaining:3,collisions:0,checkpointsCleared:completed?5:0},
      draft:{watakId:completed?'watak':'',latarId:completed?'desa':'',
        peristiwaId:completed?'peristiwa':'',useTemplate:true,
        permulaan:completed?'Pada suatu hari di desa yang permai.':'',
        perkembangan:completed?'Melur berjumpa dengan seorang pengembara.':'',
        pengakhiran:completed?'Akhirnya mereka hidup dengan gembira.':''},
      checklist:{watakDanLatar:completed,peristiwaJelas:completed,
        permulaanLengkap:completed,perkembanganLengkap:completed,
        pengakhiranLengkap:completed,duaUngkapanIndah:completed,
        bacaSemulaSantun:completed},
      reviewChecked:completed,missionCompleted:completed,xpAwarded:completed?90:0,
      badgeUnlocked:completed,attemptHistory:completed?[{
        id:'run_1731000000000',timestamp:1731000000000,mode:'pengembara',
        completedFlight:true,checkpointsReached:5,firstTryAccuracyPct:100,
        masteredCount:5,collisions:0,heartsRemaining:3,timeUsedSeconds:70,
        alternativeLanguagePath:false
      }]:[]
    });
    const cloudInitial=await api('/api/student/misi2/state',{cookie:studentA.cookie});
    assert.equal(cloudInitial.status,200,JSON.stringify(cloudInitial.data));
    assert.equal(cloudInitial.data.state,null);
    const cloudWrongAccount=await api('/api/student/misi2/state',{
      method:'PUT',cookie:studentA.cookie,
      body:{accountId:pupilB.student.id,state:misi2State(true)}
    });
    assert.equal(cloudWrongAccount.status,403);
    const cloudWrite=await api('/api/student/misi2/state',{
      method:'PUT',cookie:studentA.cookie,
      body:{accountId:pupilA.student.id,state:misi2State(true)}
    });
    assert.equal(cloudWrite.status,200,JSON.stringify(cloudWrite.data));
    const cloudBlankFromComputer=await api('/api/student/misi2/state',{
      method:'PUT',cookie:studentA.cookie,
      body:{accountId:pupilA.student.id,state:{...misi2State(false),lastUpdated:200}}
    });
    assert.equal(cloudBlankFromComputer.status,200);
    assert.equal(cloudBlankFromComputer.data.state.missionCompleted,true);
    assert.equal(cloudBlankFromComputer.data.state.attemptHistory.length,1);
    assert.match(cloudBlankFromComputer.data.state.draft.permulaan,/desa yang permai/);
    const cloudOtherPupil=await api('/api/student/misi2/state',{cookie:studentB.cookie});
    assert.equal(cloudOtherPupil.status,200);
    assert.equal(cloudOtherPupil.data.state,null);
    const cloudTeacher=await api('/api/student/misi2/state',{cookie:a.cookie});
    assert.notEqual(cloudTeacher.status,200);
    const cloudAdmin=await api('/api/student/misi2/state',{cookie:admin.cookie});
    assert.notEqual(cloudAdmin.status,200);

    // Teacher-only Misi 4 deletion: remove a selected duplicate while keeping
    // the pupil's progress and any published teacher feedback untouched.
    const seedVideo=await pool.query(
      "INSERT INTO hn_misi4_videos(organization_id,student_id,drive_file_id,mime_type,expected_bytes,status,submitted_at) VALUES((SELECT organization_id FROM hn_users WHERE id=$1),$1,'legacy-drive-test-id','video/mp4',4096,'submitted',now()) RETURNING id",
      [pupilA.student.id]
    );
    const videoId=seedVideo.rows[0].id;
    const seedFeedback=await pool.query(
      "INSERT INTO hn_teacher_feedback(organization_id,student_id,mission_id,teacher_id,strengths,status,video_id) VALUES((SELECT organization_id FROM hn_users WHERE id=$1),$1,4,$2,'Sebutannya jelas','published',$3) RETURNING id",
      [pupilA.student.id,teacherA.teacher.id,videoId]
    );
    // School administrator sees real organization-scoped Misi 4 counts and statuses,
    // while teachers and pupils cannot access the admin submissions monitor.
    const adminBeforeDelete=await api('/api/admin/submissions',{cookie:admin.cookie});
    assert.equal(adminBeforeDelete.status,200,JSON.stringify(adminBeforeDelete.data));
    assert.ok(adminBeforeDelete.data.stats.received>=1);
    assert.ok(adminBeforeDelete.data.stats.commented>=1);
    const displayed=adminBeforeDelete.data.submissions.find(x=>x.id===videoId);
    assert.equal(displayed?.status,'Telah diberikan maklum balas');
    assert.equal(displayed?.studentLoginId,pupilA.student.login_id);
    assert.equal('object_key' in displayed,false);
    assert.equal('drive_file_id' in displayed,false);
    assert.equal((await api('/api/admin/submissions',{cookie:studentA.cookie})).status,403);
    assert.equal((await api('/api/admin/submissions',{cookie:a.cookie})).status,403);
    assert.equal((await api('/api/admin/submissions',{cookie:gkmpSession.cookie})).status,200);

    assert.equal((await api('/api/misi4/teacher',{cookie:a.cookie})).data.submissions.some(x=>x.id===videoId),true);
    assert.equal((await api('/api/misi4/delete/'+videoId,{
      method:'POST',cookie:studentA.cookie,body:{confirmId:videoId}
    })).status,403);
    assert.equal((await api('/api/misi4/delete/'+videoId,{
      method:'POST',cookie:b.cookie,body:{confirmId:videoId}
    })).status,403);
    assert.equal((await api('/api/misi4/delete/'+videoId,{
      method:'POST',cookie:a.cookie,body:{confirmId:'00000000-0000-4000-8000-000000000000'}
    })).status,400);
    const deletedVideo=await api('/api/misi4/delete/'+videoId,{
      method:'POST',cookie:a.cookie,body:{confirmId:videoId}
    });
    assert.equal(deletedVideo.status,200,JSON.stringify(deletedVideo.data));
    assert.equal(deletedVideo.data.legacyDriveWarning,true);
    assert.equal((await api('/api/misi4/teacher',{cookie:a.cookie})).data.submissions.some(x=>x.id===videoId),false);
    assert.equal((await api('/api/misi4/state',{cookie:studentA.cookie})).data.submissions.some(x=>x.id===videoId),false);
    assert.equal((await api('/api/misi4/watch/'+videoId,{cookie:studentA.cookie})).status,404);
    const feedbackAfterDelete=await pool.query(
      'SELECT strengths,status,video_id FROM hn_teacher_feedback WHERE id=$1',[seedFeedback.rows[0].id]
    );
    assert.equal(feedbackAfterDelete.rows[0].strengths,'Sebutannya jelas');
    assert.equal(feedbackAfterDelete.rows[0].status,'published');
    assert.equal(feedbackAfterDelete.rows[0].video_id,null);
    const removedMetadata=await pool.query(
      'SELECT deleted_at,deleted_by,drive_file_id FROM hn_misi4_videos WHERE id=$1',[videoId]
    );
    assert.ok(removedMetadata.rows[0].deleted_at);
    assert.equal(removedMetadata.rows[0].deleted_by,teacherA.teacher.id);
    assert.equal(removedMetadata.rows[0].drive_file_id,null);
    const adminAfterDelete=await api('/api/admin/submissions',{cookie:admin.cookie});
    assert.equal(adminAfterDelete.status,200);
    assert.equal(adminAfterDelete.data.submissions.find(x=>x.id===videoId)?.status,'Dikeluarkan');
    assert.ok(adminAfterDelete.data.stats.removed>=1);

    assert.equal((await api('/api/misi4/delete/'+videoId,{
      method:'POST',cookie:a.cookie,body:{confirmId:videoId}
    })).status,404);

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

    // Server-backed mission monitoring shared across pupil, teacher, and
    // organization administrators, without exposing raw stories or media.
    const summarySave=await api('/api/student/progress/3',{
      method:'PUT',cookie:studentA.cookie,body:{
        revision:0,
        checkpoint:{kind:'practice-v1',completed:true,attemptCount:3,lastScore:10,lastTotal:12}
      }
    });
    assert.equal(summarySave.status,200);
    const pupilRecords=await api('/api/student/progress',{cookie:studentA.cookie});
    assert.equal(pupilRecords.data.progress.length,2);
    assert.equal(pupilRecords.data.progress.find(r=>r.mission_id===3).checkpoint.completed,true);
    const teacherSummary=await api('/api/teacher/progress',{cookie:a.cookie});
    assert.equal(teacherSummary.status,200);
    const mission3=teacherSummary.data.progress.find(r=>r.missionId===3);
    assert.equal(mission3.loginId,pupilA.student.login_id);
    assert.equal(mission3.completed,true);
    assert.equal(mission3.attemptCount,3);
    assert.equal(mission3.lastScore,10);
    assert.equal(mission3.lastTotal,12);
    assert.equal(mission3.state,'draft'); // Must not claim teacher/PBD verification.
    assert.equal(mission3.recordType,'latihan');
    // Raw written answers must not be copied into teacher results.
    assert.equal(Object.hasOwn(mission3,'checkpoint'),false);
    const adminSummary=await api('/api/admin/progress',{cookie:admin.cookie});
    assert.equal(adminSummary.status,200);
    assert.equal(adminSummary.data.progress.find(r=>r.missionId===3).completed,true);
    for(const privileged of [gkmpSession,panitiaSession]){
      assert.equal((await api('/api/admin/progress',{cookie:privileged.cookie})).status,200);
    }
    const forbiddenTeacherAdmin=await api('/api/admin/progress',{cookie:a.cookie});
    assert.equal(forbiddenTeacherAdmin.status,404);
    assert.equal((await api('/api/teacher/progress',{cookie:b.cookie})).data.progress.length,0);
    assert.equal((await api('/api/admin/progress',{cookie:studentA.cookie})).status,404);
    // No real Misi 4 submission is inferred from a student-declared practice flag.
    const misi4Plan=await api('/api/student/progress/4',{
      method:'PUT',cookie:studentA.cookie,body:{
        revision:0,checkpoint:{kind:'practice-v1',completed:true,attemptCount:0,lastScore:null,lastTotal:null}
      }
    });
    assert.equal(misi4Plan.status,200);
    const misi4Monitor=(await api('/api/admin/progress',{cookie:admin.cookie})).data.progress.find(r=>r.missionId===4);
    assert.equal(misi4Monitor.completed,true);
    assert.equal(misi4Monitor.state,'draft');
    assert.equal(misi4Monitor.recordType,'latihan');

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
    assert.ok(studentList.data.students.some(p=>p.id===pupilA.student.id&&p.progress_count===3));
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

    // Deleting classes must never erase pupil accounts, checkpoints or audit history.
    const emptyOwnedClass=await api('/api/teacher/classes',{method:'POST',cookie:a.cookie,
      body:{name:'5 Sementara',schoolYear:2026}});
    assert.equal(emptyOwnedClass.status,201);
    const missingConfirmation=await api('/api/classes/delete',{method:'POST',cookie:a.cookie,
      body:{classId:emptyOwnedClass.data.class.id,confirmationName:'Salah'}});
    assert.equal(missingConfirmation.status,400);
    const teacherDeletesEmpty=await api('/api/classes/delete',{method:'POST',cookie:a.cookie,
      body:{classId:emptyOwnedClass.data.class.id,confirmationName:'5 Sementara'}});
    assert.equal(teacherDeletesEmpty.status,200);
    assert.equal(teacherDeletesEmpty.data.movedStudents,0);

    const emptyAdminClass=await api('/api/teacher/classes',{method:'POST',cookie:a.cookie,
      body:{name:'5 Percubaan',schoolYear:2026}});
    assert.equal(emptyAdminClass.status,201);
    const leaderDeletesEmpty=await api('/api/classes/delete',{method:'POST',cookie:gkmpSession.cookie,
      body:{classId:emptyAdminClass.data.class.id,confirmationName:'5 Percubaan'}});
    assert.equal(leaderDeletesEmpty.status,200);

    const keepProgress=await api('/api/student/progress/2',{method:'PUT',
      cookie:studentB.cookie,body:{revision:0,checkpoint:{draft:'Karya murid kekal'}}});
    assert.equal(keepProgress.status,200);
    const blockedPopulated=await api('/api/classes/delete',{method:'POST',cookie:a.cookie,
      body:{classId:classB.data.class.id,confirmationName:'5 Bestari'}});
    assert.equal(blockedPopulated.status,409);
    assert.equal(blockedPopulated.data.error,'CLASS_HAS_STUDENTS');
    const rosterMoved=await api('/api/classes/delete',{method:'POST',cookie:panitiaSession.cookie,
      body:{classId:classB.data.class.id,confirmationName:'5 Bestari',
        destinationClassId:classA.data.class.id}});
    assert.equal(rosterMoved.status,200);
    assert.equal(rosterMoved.data.movedStudents,1);
    const classDeleted=await pool.query('SELECT count(*)::int AS count FROM hn_classes WHERE id=$1',
      [classB.data.class.id]);
    assert.equal(classDeleted.rows[0].count,0);
    const preservedMember=await pool.query('SELECT count(*)::int AS count FROM hn_class_members WHERE class_id=$1 AND student_id=$2',
      [classA.data.class.id,pupilB.student.id]);
    assert.equal(preservedMember.rows[0].count,1);
    const preservedCheckpoint=await pool.query('SELECT checkpoint FROM hn_mission_progress WHERE student_id=$1 AND mission_id=2',
      [pupilB.student.id]);
    assert.equal(preservedCheckpoint.rows[0].checkpoint.draft,'Karya murid kekal');
    assert.equal((await api('/api/auth/session',{cookie:studentB.cookie})).data.authenticated,true);

    // Secure CSV-style bulk enrollment uses short IDs and unique temporary
    // passwords without committing any real pupils' data to the repository.
    const bulkRoster=[
      {loginId:'5D-01',name:'Murid Contoh Satu'},
      {loginId:'5D-02',name:'Murid Contoh Dua'},
      {loginId:'5D-03',name:'Murid Contoh Tiga'}
    ];
    const blockedBulk=await api('/api/teacher/students/bulk',{
      method:'POST',cookie:b.cookie,
      body:{classId:classA.data.class.id,students:bulkRoster}
    });
    assert.equal(blockedBulk.status,401);
    const wrongClassBulk=await api('/api/teacher/students/bulk',{
      method:'POST',cookie:admin.cookie,
      body:{classId:classA.data.class.id,students:bulkRoster}
    });
    assert.equal(wrongClassBulk.status,404);
    const duplicateBulk=await api('/api/teacher/students/bulk',{
      method:'POST',cookie:a.cookie,
      body:{classId:classA.data.class.id,students:[bulkRoster[0],bulkRoster[0]]}
    });
    assert.equal(duplicateBulk.status,400);
    const imported=await api('/api/teacher/students/bulk',{
      method:'POST',cookie:a.cookie,
      body:{classId:classA.data.class.id,students:bulkRoster}
    });
    assert.equal(imported.status,201,JSON.stringify(imported.data));
    assert.equal(imported.data.created,3);
    assert.deepEqual(imported.data.credentials.map(x=>x.loginId),['5D-01','5D-02','5D-03']);
    assert.equal(new Set(imported.data.credentials.map(x=>x.temporaryPassword)).size,3);
    for(const row of imported.data.credentials)assert.ok(row.temporaryPassword.length>=12);
    const sample=imported.data.credentials[0];
    const bulkStudent=await signin(sample.loginId,sample.temporaryPassword);
    assert.equal(bulkStudent.data.user.mustChangePassword,true);
    assert.equal((await api('/api/student/progress',{cookie:bulkStudent.cookie})).status,403);
    const noPlainPassword=await pool.query('SELECT password_hash FROM hn_users WHERE login_id=$1',['5D-01']);
    assert.ok(!noPlainPassword.rows[0].password_hash.includes(sample.temporaryPassword));
    const importedList=await api('/api/teacher/students',{cookie:a.cookie});
    assert.ok(importedList.data.students.some(x=>x.login_id==='5D-01'));
    assert.ok(importedList.data.students.every(x=>!Object.hasOwn(x,'temporaryPassword')));
    const retryImport=await api('/api/teacher/students/bulk',{
      method:'POST',cookie:a.cookie,
      body:{classId:classA.data.class.id,students:bulkRoster}
    });
    assert.equal(retryImport.status,409);
    assert.equal(retryImport.data.error,'LOGIN_ID_CONFLICT');
    const preservedBulk=await pool.query(
      'SELECT count(*)::int AS count FROM hn_users WHERE login_id IN ($1,$2,$3)',
      ['5D-01','5D-02','5D-03']
    );
    assert.equal(preservedBulk.rows[0].count,3);
    // A teacher can reissue only first-login passwords. Pupils who already
    // chose their own password retain it, and the old temporary password stops working.
    await updatePassword(bulkStudent.cookie,sample.temporaryPassword,makePassword());
    const incorrectClassName=await api('/api/teacher/students/reissue-temporary',{
      method:'POST',cookie:a.cookie,
      body:{classId:classA.data.class.id,confirmationName:'Not The Class'}
    });
    assert.equal(incorrectClassName.status,400);
    const wrongRoleRecovery=await api('/api/teacher/students/reissue-temporary',{
      method:'POST',cookie:admin.cookie,
      body:{classId:classA.data.class.id,confirmationName:'5 Amanah'}
    });
    assert.equal(wrongRoleRecovery.status,404);
    const reissue=await api('/api/teacher/students/reissue-temporary',{
      method:'POST',cookie:a.cookie,
      body:{classId:classA.data.class.id,confirmationName:'5 Amanah'}
    });
    assert.equal(reissue.status,200,JSON.stringify(reissue.data));
    assert.equal(reissue.data.reissued,2);
    assert.ok(reissue.data.unaffected>=2);
    assert.deepEqual(reissue.data.credentials.map(r=>r.loginId),['5D-02','5D-03']);
    const before=imported.data.credentials.find(r=>r.loginId==='5D-02');
    assert.equal((await api('/api/auth/login',{method:'POST',
      body:{id:before.loginId,password:before.temporaryPassword}})).status,401);
    const after=reissue.data.credentials.find(r=>r.loginId==='5D-02');
    const newPupilSession=await signin(after.loginId,after.temporaryPassword);
    assert.equal(newPupilSession.data.user.mustChangePassword,true);
    const keepPassword=await api('/api/auth/session',{cookie:bulkStudent.cookie});
    assert.equal(keepPassword.data.authenticated,true);
    const reissueHistory=await pool.query(
      "SELECT count(*)::int AS count FROM hn_audit WHERE action='reissue_initial_pupil_passwords'"
    );
    assert.ok(reissueHistory.rows[0].count>=1);



    // Student-specific recovery works AFTER a pupil has set a personal password.
    const singleUser=(await pool.query(
      "SELECT id,must_change_password FROM hn_users WHERE login_id='5D-01'"
    )).rows[0];
    assert.equal(singleUser.must_change_password,false);
    const invalidSelection=await api('/api/teacher/students/reissue-temporary',{
      method:'POST',cookie:a.cookie,body:{
        classId:classA.data.class.id,mode:'student',
        studentId:pupilA.student.id,confirmationName:'5 Amanah',
        confirmationLoginId:pupilA.student.login_id
      }
    });
    assert.equal(invalidSelection.status,404);
    assert.equal(invalidSelection.data.error,'STUDENT_NOT_IN_CLASS');
    const incorrectStudentId=await api('/api/teacher/students/reissue-temporary',{
      method:'POST',cookie:a.cookie,body:{
        classId:classA.data.class.id,mode:'student',
        studentId:singleUser.id,confirmationName:'5 Amanah',
        confirmationLoginId:'5D-99'
      }
    });
    assert.equal(incorrectStudentId.status,400);
    const inactiveStudent=await api('/api/admin/users/status',{
      method:'POST',cookie:admin.cookie,body:{
        userId:(await pool.query("SELECT id FROM hn_users WHERE login_id='5D-03'")).rows[0].id,
        active:false
      }
    });
    assert.equal(inactiveStudent.status,200);
    const student03=(await pool.query("SELECT id FROM hn_users WHERE login_id='5D-03'")).rows[0];
    const deniedInactive=await api('/api/teacher/students/reissue-temporary',{
      method:'POST',cookie:a.cookie,body:{
        classId:classA.data.class.id,mode:'student',
        studentId:student03.id,confirmationName:'5 Amanah',
        confirmationLoginId:'5D-03'
      }
    });
    assert.equal(deniedInactive.status,409);
    assert.equal(deniedInactive.data.error,'STUDENT_INACTIVE');
    await api('/api/admin/users/status',{
      method:'POST',cookie:admin.cookie,body:{userId:student03.id,active:true}
    });
    const oneStudentReset=await api('/api/teacher/students/reissue-temporary',{
      method:'POST',cookie:a.cookie,body:{
        classId:classA.data.class.id,mode:'student',
        studentId:singleUser.id,confirmationName:'5 Amanah',
        confirmationLoginId:'5D-01'
      }
    });
    assert.equal(oneStudentReset.status,200,JSON.stringify(oneStudentReset.data));
    assert.equal(oneStudentReset.data.mode,'student');
    assert.equal(oneStudentReset.data.reissued,1);
    assert.equal(oneStudentReset.data.credentials[0].loginId,'5D-01');
    assert.equal((await api('/api/auth/session',{cookie:bulkStudent.cookie})).data.authenticated,false);
    assert.equal((await api('/api/auth/session',{cookie:newPupilSession.cookie})).data.authenticated,true);
    const firstResetLogin=await signin('5D-01',oneStudentReset.data.credentials[0].temporaryPassword);
    assert.equal(firstResetLogin.data.user.mustChangePassword,true);
    assert.equal((await pool.query(
      "SELECT must_change_password FROM hn_users WHERE login_id='5D-01'"
    )).rows[0].must_change_password,true);

    // Explicit whole-class reset revokes every ACTIVE pupil's prior password,
    // even when it was personally chosen; no pupil records or progress are erased.
    const classReset=await api('/api/teacher/students/reissue-temporary',{
      method:'POST',cookie:a.cookie,body:{
        classId:classA.data.class.id,mode:'class',confirmationName:'5 Amanah'
      }
    });
    assert.equal(classReset.status,200,JSON.stringify(classReset.data));
    assert.equal(classReset.data.mode,'class');
    assert.equal(classReset.data.reissued,4);
    assert.equal(new Set(classReset.data.credentials.map(r=>r.temporaryPassword)).size,4);
    assert.ok(classReset.data.credentials.some(r=>r.loginId===pupilB.student.login_id));
    assert.equal((await api('/api/auth/session',{cookie:firstResetLogin.cookie})).data.authenticated,false);
    assert.equal((await api('/api/auth/session',{cookie:newPupilSession.cookie})).data.authenticated,false);
    assert.equal((await api('/api/auth/session',{cookie:studentB.cookie})).data.authenticated,false);
    const newClassLogin=await signin('5D-03',
      classReset.data.credentials.find(r=>r.loginId==='5D-03').temporaryPassword);
    assert.equal(newClassLogin.data.user.mustChangePassword,true);
    const intactProgress=await pool.query(
      'SELECT checkpoint FROM hn_mission_progress WHERE student_id=$1 AND mission_id=2',
      [pupilB.student.id]
    );
    assert.equal(intactProgress.rows[0].checkpoint.draft,'Karya murid kekal');
    const newAudit=await pool.query(
      "SELECT action FROM hn_audit WHERE action IN ('reset_pupil_password','reset_all_class_pupil_passwords')"
    );
    assert.ok(newAudit.rows.some(r=>r.action==='reset_pupil_password'));
    assert.ok(newAudit.rows.some(r=>r.action==='reset_all_class_pupil_passwords'));


    const testPupil=(await pool.query("SELECT id FROM hn_users WHERE login_id='5D-03'")).rows[0];
    const testStudent=newClassLogin;
    await updatePassword(testStudent.cookie,
      classReset.data.credentials.find(x=>x.loginId==='5D-03').temporaryPassword,makePassword());
    const outsideStudent=await signin('5D-02',
      classReset.data.credentials.find(x=>x.loginId==='5D-02').temporaryPassword);
    await updatePassword(outsideStudent.cookie,
      classReset.data.credentials.find(x=>x.loginId==='5D-02').temporaryPassword,makePassword());
    const unassignedTeacher=await signin(addedByGkmp.data.teacher.login_id,
      addedByGkmp.data.temporaryPassword);
    await updatePassword(unassignedTeacher.cookie,addedByGkmp.data.temporaryPassword,makePassword());

    // Five teacher modules: pupil submits their own TEXT evidence, teacher
    // enters TP manually and only publishes feedback when ready.
    const initialLearning=await api('/api/teacher/learning',{cookie:a.cookie});
    assert.equal(initialLearning.status,200,JSON.stringify(initialLearning.data));
    assert.deepEqual(initialLearning.data.assessments,[]);
    assert.deepEqual(initialLearning.data.feedback,[]);
    assert.deepEqual(initialLearning.data.portfolio,[]);
    assert.deepEqual(initialLearning.data.interventions,[]);
    assert.equal((await api('/api/teacher/learning',{cookie:testStudent.cookie})).status,404);
    assert.equal((await api('/api/student/learning',{cookie:a.cookie})).status,404);
    const invalidWork=await api('/api/student/portfolio',{method:'POST',cookie:testStudent.cookie,
      body:{missionId:2,title:'Karya',content:'Pendek'}});
    assert.equal(invalidWork.status,400);
    const textWork=await api('/api/student/portfolio',{method:'POST',cookie:testStudent.cookie,
      body:{missionId:2,title:'Cerita Hikayat Baharu',content:'Pada suatu petang, anak kampung membantu penghulu dengan bahasa yang santun.'}});
    assert.equal(textWork.status,201,JSON.stringify(textWork.data));
    const workId=textWork.data.entry.id;
    const ownWork=await api('/api/student/learning',{cookie:testStudent.cookie});
    assert.equal(ownWork.status,200);
    assert.equal(ownWork.data.portfolio[0].id,workId);
    assert.equal(ownWork.data.feedback.length,0);
    assert.equal(ownWork.data.assessments.length,0);
    assert.equal((await api('/api/student/learning',{cookie:outsideStudent.cookie})).data.portfolio.length,0);
    assert.equal((await api('/api/teacher/learning',{cookie:unassignedTeacher.cookie})).data.portfolio.length,0);
    const teacherLearning=await api('/api/teacher/learning',{cookie:a.cookie});
    assert.equal(teacherLearning.data.portfolio[0].student_id,testPupil.id);

    const unauthorizedTp=await api('/api/teacher/pbd',{method:'POST',cookie:unassignedTeacher.cookie,
      body:{studentId:testPupil.id,missionId:2,expectedRevision:0,tp:3,
        rubric:{olah:3},evidence:'Cerita ditulis sendiri oleh murid',justification:'Murid menunjukkan perkembangan yang baik',status:'confirmed'}});
    assert.equal(unauthorizedTp.status,404);
    const invalidTp=await api('/api/teacher/pbd',{method:'POST',cookie:a.cookie,
      body:{studentId:testPupil.id,missionId:2,expectedRevision:0,tp:5,
        rubric:{},evidence:'',justification:'',status:'confirmed'}});
    assert.equal(invalidTp.status,400);
    const draftTp=await api('/api/teacher/pbd',{method:'POST',cookie:a.cookie,
      body:{studentId:testPupil.id,missionId:2,expectedRevision:0,tp:null,
        rubric:{olah:3,bahasa:2},evidence:'Teks cerpen telah disemak oleh Guru',
        justification:'Memerlukan semakan akhir sebelum TP diberi',status:'draft'}});
    assert.equal(draftTp.status,200,JSON.stringify(draftTp.data));
    assert.equal(draftTp.data.assessment.revision,1);
    assert.equal((await api('/api/student/learning',{cookie:testStudent.cookie})).data.assessments.length,0);
    const confirmedTp=await api('/api/teacher/pbd',{method:'POST',cookie:a.cookie,
      body:{studentId:testPupil.id,missionId:2,expectedRevision:1,tp:4,
        rubric:{olah:3,bahasa:3,santun:4,persembahan:0},
        evidence:'Karya hikayat murid telah disemak oleh Guru dalam portfolio.',
        justification:'Murid mampu mengolah cerita dengan kesantunan dan bahasa yang sesuai.',
        status:'confirmed'}});
    assert.equal(confirmedTp.status,200,JSON.stringify(confirmedTp.data));
    assert.equal(confirmedTp.data.assessment.revision,2);
    assert.equal((await api('/api/student/learning',{cookie:testStudent.cookie})).data.assessments[0].tp,4);
    const staleTp=await api('/api/teacher/pbd',{method:'POST',cookie:a.cookie,
      body:{studentId:testPupil.id,missionId:2,expectedRevision:1,tp:2,
        rubric:{olah:1},evidence:'Pertukaran nilai tidak sepatutnya',
        justification:'Ujian konflik semakan pentaksiran',status:'confirmed'}});
    assert.equal(staleTp.status,409);
    const historyTp=await pool.query(
      'SELECT revision FROM hn_pbd_assessment_history WHERE student_id=$1 AND mission_id=2 ORDER BY revision',
      [testPupil.id]);
    assert.deepEqual(historyTp.rows.map(x=>x.revision),[1,2]);

    const inaccessibleFeedback=await api('/api/teacher/feedback',{method:'POST',cookie:unassignedTeacher.cookie,
      body:{studentId:testPupil.id,missionId:2,strengths:'Karya yang sangat baik',
        improvements:'Susunan ayat boleh ditambah baik',nextSteps:'Baca semula dan sunting',
        status:'published'}});
    assert.equal(inaccessibleFeedback.status,404);
    const draftFb=await api('/api/teacher/feedback',{method:'POST',cookie:a.cookie,
      body:{studentId:testPupil.id,missionId:2,strengths:'Kreatif dan bersopan',
        improvements:'Boleh tambahkan ungkapan',nextSteps:'Sunting semula cerita',status:'draft'}});
    assert.equal(draftFb.status,200);
    assert.equal((await api('/api/student/learning',{cookie:testStudent.cookie})).data.feedback.length,0);
    const publishFb=await api('/api/teacher/feedback',{method:'POST',cookie:a.cookie,
      body:{feedbackId:draftFb.data.feedback.id,studentId:testPupil.id,missionId:2,
        strengths:'Kreatif dan bersopan',improvements:'Boleh tambahkan ungkapan',
        nextSteps:'Sunting semula cerita',status:'published'}});
    assert.equal(publishFb.status,200);
    assert.equal((await api('/api/student/learning',{cookie:testStudent.cookie})).data.feedback.length,1);

    const plan=await api('/api/teacher/interventions',{method:'POST',cookie:a.cookie,
      body:{studentId:testPupil.id,missionId:3,
        plan:'Bimbingan individu tentang ungkapan indah pada masa pengajaran seterusnya',
        status:'planned'}});
    assert.equal(plan.status,200);
    const closedPlan=await api('/api/teacher/interventions',{method:'POST',cookie:a.cookie,
      body:{interventionId:plan.data.intervention.id,studentId:testPupil.id,
        missionId:3,plan:'Bimbingan individu sudah disempurnakan semasa latihan ulang kaji',
        status:'completed'}});
    assert.equal(closedPlan.status,200);
    assert.equal(closedPlan.data.intervention.status,'completed');
    const review=await api('/api/teacher/portfolio/review',{method:'POST',cookie:a.cookie,
      body:{entryId:workId,status:'reviewed'}});
    assert.equal(review.status,200);
    assert.equal((await api('/api/student/learning',{cookie:testStudent.cookie})).data.portfolio[0].status,'reviewed');
    const forbiddenReview=await api('/api/teacher/portfolio/review',{method:'POST',cookie:unassignedTeacher.cookie,
      body:{entryId:workId,status:'revision_requested'}});
    assert.equal(forbiddenReview.status,404);
    assert.equal((await api('/api/teacher/learning',{cookie:unassignedTeacher.cookie})).data.assessments.length,0);
    assert.equal((await api('/api/teacher/learning',{cookie:admin.cookie})).status,404);
    const audits=await pool.query(
      "SELECT action FROM hn_audit WHERE action IN ('confirm_pbd','save_pbd_draft','save_teacher_feedback','submit_portfolio_text','save_teacher_intervention')"
    );
    for(const action of ['confirm_pbd','save_pbd_draft','save_teacher_feedback',
      'submit_portfolio_text','save_teacher_intervention'])
      assert.ok(audits.rows.some(x=>x.action===action),action);

    // Personal Teacher settings are private, revisioned, and use actual classes.
    const initialSettings=await api('/api/teacher/settings',{cookie:a.cookie});
    assert.equal(initialSettings.status,200,JSON.stringify(initialSettings.data));
    assert.equal(initialSettings.data.profile.name,'Guru Amanah');
    assert.equal(initialSettings.data.preferences.revision,0);
    assert.equal(initialSettings.data.preferences.default_class_id,null);
    assert.ok(initialSettings.data.sessions.some(x=>x.current===true));
    assert.ok(initialSettings.data.sessions.every(x=>!Object.hasOwn(x,'token_hash')));
    assert.equal((await api('/api/teacher/settings',{cookie:testStudent.cookie})).status,404);
    assert.equal((await api('/api/teacher/settings',{cookie:admin.cookie})).status,404);
    const wrongNamePassword=await api('/api/teacher/settings/profile',{
      method:'POST',cookie:a.cookie,body:{name:'Guru Baharu',currentPassword:'wrong-password'}
    });
    assert.equal(wrongNamePassword.status,401);
    const renamedTeacher=await api('/api/teacher/settings/profile',{
      method:'POST',cookie:a.cookie,
      body:{name:'Guru Amanah Baharu',currentPassword:teacherAPassword}
    });
    assert.equal(renamedTeacher.status,200,JSON.stringify(renamedTeacher.data));
    assert.equal((await api('/api/auth/session',{cookie:a.cookie})).data.user.name,'Guru Amanah Baharu');

    const foreignSettingsClass=await api('/api/teacher/classes',{
      method:'POST',cookie:unassignedTeacher.cookie,
      body:{name:'5 Kelas Guru Lain',schoolYear:2026}
    });
    assert.equal(foreignSettingsClass.status,201);
    const illegalClassPrefs=await api('/api/teacher/settings/preferences',{
      method:'POST',cookie:a.cookie,
      body:{defaultClassId:foreignSettingsClass.data.class.id,compactTables:true,
        reduceMotion:true,highContrast:true,expectedRevision:0}
    });
    assert.equal(illegalClassPrefs.status,404);
    const invalidPrefs=await api('/api/teacher/settings/preferences',{
      method:'POST',cookie:a.cookie,
      body:{defaultClassId:classA.data.class.id,compactTables:'true',
        reduceMotion:true,highContrast:true,expectedRevision:0}
    });
    assert.equal(invalidPrefs.status,400);
    const savedPrefs=await api('/api/teacher/settings/preferences',{
      method:'POST',cookie:a.cookie,
      body:{defaultClassId:classA.data.class.id,compactTables:true,
        reduceMotion:true,highContrast:false,expectedRevision:0}
    });
    assert.equal(savedPrefs.status,200,JSON.stringify(savedPrefs.data));
    assert.equal(savedPrefs.data.preferences.revision,1);
    assert.equal(savedPrefs.data.preferences.default_class_id,classA.data.class.id);
    assert.equal(savedPrefs.data.preferences.compact_tables,true);
    assert.equal(savedPrefs.data.preferences.reduce_motion,true);
    const retryPrefs=await api('/api/teacher/settings/preferences',{
      method:'POST',cookie:a.cookie,
      body:{defaultClassId:null,compactTables:false,
        reduceMotion:false,highContrast:false,expectedRevision:0}
    });
    assert.equal(retryPrefs.status,409);
    assert.equal((await api('/api/teacher/settings',{cookie:a.cookie}))
      .data.preferences.default_class_id,classA.data.class.id);
    assert.equal((await api('/api/teacher/settings',{cookie:unassignedTeacher.cookie}))
      .data.preferences.default_class_id,null);
    const secondaryTeacherSession=await signin(teacherA.teacher.login_id,teacherAPassword);
    const twoSessions=await api('/api/teacher/settings',{cookie:a.cookie});
    assert.ok(twoSessions.data.sessions.length>=2);
    assert.equal(twoSessions.data.sessions.filter(x=>x.current).length,1);
    const missingSignoutConfirmation=await api('/api/teacher/settings/sessions/logout-others',{
      method:'POST',cookie:a.cookie,body:{confirmation:'WRONG'}
    });
    assert.equal(missingSignoutConfirmation.status,400);
    const revokeOtherSessions=await api('/api/teacher/settings/sessions/logout-others',{
      method:'POST',cookie:a.cookie,body:{confirmation:teacherA.teacher.login_id}
    });
    assert.equal(revokeOtherSessions.status,200);
    assert.ok(revokeOtherSessions.data.revoked>=1);
    assert.equal((await api('/api/auth/session',{cookie:secondaryTeacherSession.cookie}))
      .data.authenticated,false);
    assert.equal((await api('/api/auth/session',{cookie:a.cookie})).data.authenticated,true);
    const teacherSettingsAudit=await pool.query(
      "SELECT action FROM hn_audit WHERE action IN ('update_own_teacher_profile','update_own_teacher_settings','logout_other_teacher_sessions')"
    );
    for(const action of ['update_own_teacher_profile','update_own_teacher_settings','logout_other_teacher_sessions']){
      assert.ok(teacherSettingsAudit.rows.some(x=>x.action===action),action);
    }
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
    const crossOrgClassDelete=await api('/api/classes/delete',{method:'POST',cookie:otherAdmin.cookie,
      body:{classId:classA.data.class.id,confirmationName:'5 Amanah'}});
    assert.equal(crossOrgClassDelete.status,404);
    const crossOrgDelete=await api('/api/admin/users/delete',{method:'POST',cookie:otherAdmin.cookie,
      body:{userId:teacherA.teacher.id,confirmationId:teacherA.teacher.login_id}});
    assert.equal(crossOrgDelete.status,404);
    const outsideProgress=await api('/api/admin/progress',{cookie:otherAdmin.cookie});
    assert.equal(outsideProgress.status,200);
    assert.deepEqual(outsideProgress.data.progress,[]);
    const outsideRoster=await api('/api/admin/roster',{cookie:otherAdmin.cookie});
    assert.equal(outsideRoster.status,200);
    assert.deepEqual(outsideRoster.data.roster,[]);

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
    assert.ok(logs.rows.some(x=>x.action==='delete_class'));

    assert.ok(logs.rows.some(x=>x.action==='login'&&x.actor_id===null),
      'Historical audit events survive account removal without retaining a user foreign key');
  }finally{
    server.kill('SIGTERM');
    await pool.end();
  }
});
