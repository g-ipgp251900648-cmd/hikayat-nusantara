import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Guru has a confirmed delete action for one Misi 4 recording',()=>{
  const ui=read('teacher-dashboard.js');
  assert.match(ui,/data-m4-delete/);
  assert.match(ui,/window\.confirm\(/);
  assert.match(ui,/method:'POST',credentials:'same-origin'/);
  assert.match(ui,/confirmId:id/);
  assert.match(ui,/await load\(\)/);
});
test('Only an assigned teacher can delete a recording from their organization',()=>{
  const api=read('misi4-video-api.js');
  assert.match(api,/path\.startsWith\('\/api\/misi4\/delete\/'\)&&req\.method==='POST'/);
  assert.match(api,/user\.role!=='guru'/);
  assert.match(api,/body\?\.confirmId!==id/);
  assert.match(api,/AND organization_id=\$2 AND status='submitted' AND deleted_at IS NULL FOR UPDATE/);
  assert.match(api,/teacherHasStudent\(client,user,item\.student_id\)/);
  assert.match(api,/pg_advisory|FOR UPDATE/);
  assert.match(api,/DeleteObjectCommand\(\{Bucket:cfg\.bucket,Key:item\.object_key\}\)/);
});
test('Deleted recordings are hidden from teacher, pupil and watch routes',()=>{
  const api=read('misi4-video-api.js');
  assert.match(api,/v\.deleted_at IS NULL/);
  const count=(api.match(/deleted_at IS NULL/g)||[]).length;
  assert.ok(count>=5,'upload, list, watch and delete must check deleted_at');
  assert.match(api,/UPDATE hn_teacher_feedback SET video_id=NULL/);
  assert.match(api,/teacher_remove_misi4_video/);
  const feedback=read('auth/api.js');
  assert.match(feedback,/deleted_at IS NULL AND \(object_key IS NOT NULL OR drive_file_id IS NOT NULL\)/);
});
test('Existing PBD and comments remain after removal; migration is idempotent',()=>{
  const sql=read('auth/misi4-video-migration.sql');
  assert.match(sql,/ALTER TABLE hn_misi4_videos ADD COLUMN IF NOT EXISTS deleted_at/);
  assert.match(sql,/ALTER TABLE hn_misi4_videos ADD COLUMN IF NOT EXISTS deleted_by/);
  const api=read('misi4-video-api.js');
  assert.doesNotMatch(api,/DELETE FROM hn_teacher_feedback/);
  assert.doesNotMatch(api,/DELETE FROM hn_pbd/);
});
