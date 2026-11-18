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
  assert.match(src('server.js'),/\[\"\/mission-four-ai-bridge\\.js\",\s*\[\"mission-four-ai-bridge\\.js\"/);
  assert.match(src('mission-four-ai-bridge.js'),/event\.source!==iframe\.contentWindow/);
});
test('the unauthenticated Render portal cannot pretend teacher uploads succeeded',()=>{
  assert.match(src('server.js'),/MISI4_BACKEND_NOT_CONFIGURED/);
  assert.match(src('mission-four-ai-bridge.js'),/receipt not verified/);
  assert.match(src('mission-four-ai-bridge.js'),/res\.ok|r\.ok/);
});
