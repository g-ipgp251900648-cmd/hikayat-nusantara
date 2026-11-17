import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');
test('Aktiviti 1 opens the original AI Studio game, not the earlier prototype', () => {
  const html = read('index.html');
  assert.match(html, /src="mission-one-ai-bridge\.js"/);
  assert.doesNotMatch(html, /src="mission-one-3d\.js"/);
  assert.match(read('student-activities.js'), /openMissionOneAdventure/);
  assert.ok(existsSync(join(root, 'mission-one-ai/src/App.tsx')));
  assert.ok(existsSync(join(root, 'mission-one-ai/src/game/world.ts')));
  assert.ok(existsSync(join(root, 'mission-one-ai/src/game/hangTuah.ts')));
});
test('Root build and server publish the original game at /misi1/', () => {
  const build=read('build.mjs'), server=read('server.js');
  assert.match(build, /mission-one-ai\/vite\.config\.ts/);
  assert.match(build, /mission-one-ai-bridge\.js/);
  assert.match(server, /pathname === '\/misi1'/);
  assert.match(server, /SAMEORIGIN/);
  assert.match(server, /mission-one-ai-bridge\.js/);
});
test('The original educational content and five JPG illustrations are preserved', () => {
  const data=read('mission-one-ai/src/game/data.ts');
  assert.match(data,/SCROLL_STATIONS/);
  assert.match(data,/STORY_PAGES/);
  assert.match(data,/SEQUENCE_EVENTS/);
  assert.match(data,/QUIZ_QUESTIONS/);
  for(let i=1;i<=5;i++){
    assert.match(data, new RegExp(`'/misi1/src/assets/images/story_page_${i}_`));
    const originalImages=['story_page_1_1794930837095.jpg','story_page_2_1794930837263.jpg','story_page_3_1794930839118.jpg','story_page_4_1794930839332.jpg','story_page_5_1794930838727.jpg'];
    assert.ok(existsSync(join(root,'mission-one-ai/src/assets/images_b64',originalImages[i-1]+'.b64')));
  }
});
test('Embedded game uses same-origin progress bridge and server-side static assets',()=>{
  const bridge=read('mission-one-ai-bridge.js');
  const app=read('mission-one-ai/src/App.tsx');
  assert.match(bridge,/event\.origin !== window\.location\.origin/);
  assert.match(bridge,/window\.submitMissionOneAdventure/);
  assert.match(bridge,/new Set\(orderedIds\)\.size !== 5/);
  assert.match(app,/notifyHikayatPortal\('attempt'/);
  assert.match(app,/notifyHikayatPortal\('victory'/);
  assert.match(read('student-activities.js'),/const score=positions\+comprehensionScore,success=score===8/);
});
