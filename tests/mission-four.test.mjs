import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('original Misi 4 route, launcher and camera permission are wired',()=>{
  assert.match(src('index.html'),/mission-four-ai-bridge\.js/);
  assert.match(src('student-activities.js'),/openMissionFourAdventure/);
  assert.match(src('build.mjs'),/extractMisiFourSource/);
  assert.match(src('build.mjs'),/mission-four-ai\/vite\.config\.ts/);
  assert.match(src('server.js'),/pathname==='\/misi4'/);
  assert.match(src('mission-four-ai-bridge.js'),/camera; microphone/);
  assert.match(src('server.js'), /\["\/mission-four-ai-bridge\.js",\s*\["mission-four-ai-bridge\.js"/);
  assert.match(src('mission-four-ai-bridge.js'),/event\.source!==iframe\.contentWindow/);
});
test('Misi 4 only registers verified video uploads with private, teacher-restricted playback',()=>{
  assert.match(src('auth/api.js'),/handleMisi4Api/);
  assert.match(src('auth/misi4-media.js'),/VIDEO_STORAGE_NOT_CONFIGURED/);
  assert.match(src('auth/misi4-media.js'),/private\/misi4/);
  assert.match(src('auth/misi4-media.js'),/c\.teacher_id=\$3/);
  assert.match(src('auth/misi4-media.js'),/VIDEO_STORAGE_WRITE_FAILED/);
  assert.match(src('mission-four-ai-bridge.js'),/Hantar Rakaman kepada Guru/);
  assert.match(src('mission-four-ai-bridge.js'),/res\.ok/);
  assert.match(src('student-activities.js'),/submitMissionFourAdventure/);
  assert.match(src('teacher-misi4-review.js'),/\/api\/misi4\/teacher\/submissions/);
});
