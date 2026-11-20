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
test('the unauthenticated Render portal cannot pretend teacher uploads succeeded',()=>{
  assert.match(src('server.js'),/MISI4_BACKEND_NOT_CONFIGURED/);
  assert.match(src('mission-four-ai-bridge.js'),/receipt not verified/);
  assert.match(src('mission-four-ai-bridge.js'),/res\.ok|r\.ok/);
});

test('Misi 4 marks pupil dashboard complete only after server verifies a video',()=>{
  const student=src('student-activities.js');
  const bridge=src('mission-four-ai-bridge.js');
  assert.match(student,/window\.submitMissionFourAdventure=async payload/);
  assert.match(student,/window\.hnApiRequest\('\/api\/misi4\/state'\)/);
  assert.match(student,/payload\.verified!==true/);
  assert.match(student,/item\.status==='Telah Dihantar'/);
  assert.match(student,/state\.completed\[3\]=true/);
  assert.match(student,/await initializeCloud\(\);\s*await verifyMissionFourStatus\(\);/);
  assert.match(student,/if\(cloud\.ready\)queueCloud\(\)/);
  assert.match(bridge,/await window\.submitMissionFourAdventure/);
  assert.match(bridge,/completion\?\.ok!==true/);
  assert.match(bridge,/Misi 4 ditandakan selesai \(80 XP\)/);
});
