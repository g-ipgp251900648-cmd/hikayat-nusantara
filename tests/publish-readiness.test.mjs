import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Misi 1–4 are bundled with the original applications and authenticated routes',()=>{
  const build=read('build.mjs'),server=read('server.js');
  for(const m of [1,2,3,4]){
    assert.match(build,new RegExp('mission-'+['one','two','three','four'][m-1]));
    assert.match(server,new RegExp("pathname==='\\/misi"+m+"'"));
  }
  assert.match(server,/authorizeMissionRequest\(request\)/);
  assert.match(server,/PUBLIC_FILES\.get\(pathname\)/);
});

test('Neon Misi 4 streams private video uploads of at most 100 MiB and verifies teacher access',()=>{
  const api=read('misi4-video-api.js');
  assert.match(api,/const MAX_BYTES=100\*1024\*1024/);
  assert.match(api,/const s3=makeS3\(cfg\)/);
  assert.match(api,/pipeline\(req,bounded,stream\)/);
  assert.match(api,/user\.role!=='murid'/);
  assert.match(api,/teacherHasStudent\(db,user,item\.student_id\)/);
  assert.match(api,/organization_id=\$2/);
  assert.match(api,/GetObjectCommand/);
  assert.doesNotMatch(api,/acl:\s*['"]public-read/);
});

test('Only authenticated teachers can publish feedback; pupils only get published comments',()=>{
  const api=read('auth/api.js'),student=read('student-portfolio-ui.js');
  const teacher=read('teacher-learning-ui.js');
  assert.match(api,/pathname==='\/api\/teacher\/feedback'&&method==='POST'&&user\.role==='guru'/);
  assert.match(api,/teacherClassForStudent\(db,user,body\.studentId\)/);
  assert.match(api,/SELECT id FROM hn_misi4_videos WHERE id=\$1 AND student_id=\$2 AND organization_id=\$3/);
  assert.match(api,/status IN \('published','revision_requested'\)/);
  assert.match(student,/api\/student\/learning/);
  assert.match(student,/for\(let i=1;i<=4;i\+\+\)/);
  assert.doesNotMatch(student,/Hantar Karya Bertulis/);
  assert.match(teacher,/Terbitkan kepada Murid/);
  assert.match(teacher,/videoId:videoSelect\.value/);
});

test('Video comments are linked to the selected Misi 4 submission',()=>{
  const sql=read('auth/misi4-video-migration.sql');
  const review=read('teacher-dashboard.js');
  assert.match(sql,/ADD COLUMN IF NOT EXISTS video_id uuid REFERENCES hn_misi4_videos\(id\) ON DELETE SET NULL/);
  assert.match(review,/data-m4-comment/);
  assert.match(review,/hn:teacher-review-video/);
});

test('Build validates both S3 dependencies before Render starts',()=>{
  const build=read('build.mjs');
  assert.match(build,/@aws-sdk\/client-s3/);
  assert.match(build,/@aws-sdk\/lib-storage/);
  const render=read('render.yaml');
  assert.match(render,/npm install --omit=dev/);
  assert.match(render,/healthCheckPath: \/health/);
});
