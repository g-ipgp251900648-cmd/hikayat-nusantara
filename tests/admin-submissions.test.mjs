import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Admin Penghantaran & Karya is an active dashboard, not a placeholder',()=>{
  const s=read('admin-dashboard.js');
  assert.doesNotMatch(s,/const pendingPages=new Set\([^\n]*'admin-penghantaran'/);
  assert.match(s,/hn-admin-submissions-root/);
  assert.match(s,/fetch\('\/api\/admin\/submissions'/);
  assert.match(s,/data-hn-submissions-tbody/);
  assert.match(s,/Muat Semula/);
  assert.match(s,/Semua kelas/);
  assert.match(s,/Semua status/);
});
test('API checks leadership and organization scope without leaking private file keys',()=>{
  const s=read('auth/api.js');
  const start=s.indexOf("if(pathname==='/api/admin/submissions'&&method==='GET')");
  const end=s.indexOf("if(pathname==='/api/admin/progress'",start);
  assert.ok(start>-1&&end>start);
  const route=s.slice(start,end);
  assert.match(route,/canAdmin\(user\.role\)/);
  assert.match(route,/v\.organization_id=\$1/);
  assert.match(route,/u\.organization_id=\$1/);
  assert.match(route,/hn_teacher_feedback f/);
  assert.match(route,/f\.video_id=v\.id/);
  assert.match(route,/pending_review/);
  assert.match(route,/unfinished_upload/);
  assert.doesNotMatch(route,/SELECT \*/);
  assert.doesNotMatch(route,/object_key|drive_file_id|password_hash|videoBase64|watchUrl/);
});
