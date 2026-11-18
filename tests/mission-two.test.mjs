import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(join(root,p),'utf8');

test('Misi 2 asal dibuka daripada Ruang Murid, bukan misi lama',()=>{
  const html=read('index.html');
  const activities=read('student-activities.js');
  assert.match(html,/src="mission-two-ai-bridge\.js"/);
  assert.match(activities,/index===1&&typeof window\.openMissionTwoAdventure/);
  assert.match(activities,/window\.submitMissionTwoAdventure=/);
  assert.match(activities,/window\.submitMissionTwoFlightAttempt=/);
});

test('Bridge Wau Sakti menggunakan iframe sama-origin dan semakan sumber mesej',()=>{
  const bridge=read('mission-two-ai-bridge.js');
  assert.match(bridge,/iframe\.src = '\/misi2\/'/);
  assert.match(bridge,/event\.origin !== window\.location\.origin/);
  assert.match(bridge,/event\.source !== iframe\.contentWindow/);
  assert.match(bridge,/submitMissionTwoAdventure/);
  assert.match(bridge,/submitMissionTwoFlightAttempt/);
});

test('Sumber permainan asal lengkap termasuk 5 gerbang, bengkel penulisan, audio dan 3D',()=>{
  const data=read('mission-two-ai/src/game/data.ts');
  assert.equal((data.match(/gateName:/g)||[]).length,5);
  assert.match(data,/sinar keemasan menyelimuti desa/);
  assert.match(data,/cahaya harapan/);
  const app=read('mission-two-ai/src/App.tsx');
  assert.match(app,/notifyHikayatPortal\('attempt'/);
  assert.match(app,/notifyHikayatPortal\('victory'/);
  assert.match(app,/WritingWorkshop/);
  assert.match(app,/WorldViewport3D/);
  assert.match(read('mission-two-ai/src/audio/malayAudio.ts'),/AudioContext/);
});

test('Misi 2 merekod 5 markah checkpoint dan membuka 90 XP setelah karya lengkap',()=>{
  const s=read('student-activities.js');
  assert.match(s,/recordAttempt\(1,raw\.masteredCount,5,/);
  assert.match(s,/misi2Phrases\.filter/);
  assert.match(s,/state\.completed\[1\]=true/);
  assert.match(s,/state\.writtenStory=story\.slice/);
  assert.match(s,/localStorage\.removeItem\("hikayat_nusantara_misi2_state_v1:"\+account\.id\)/);
  const source=read('mission-two-ai/src/game/writing.ts');
  assert.match(source,/awardMissionXpOnce/);
  assert.match(source,/canCompleteMission/);
});

test('Build Vite dan server menyokong misi 1 dan misi 2 serentak',()=>{
  const build=read('build.mjs'),server=read('server.js');
  assert.match(build,/mission-one-ai\/vite\.config\.ts/);
  assert.match(build,/mission-two-ai\/vite\.config\.ts/);
  assert.match(build,/'mission-two-ai-bridge\.js'/);
  assert.match(server,/pathname==='\/misi2'/);
  assert.match(server,/\/mission-two-ai-bridge\.js/);
  assert.match(read('mission-two-ai/vite.config.ts'),/base: '\/misi2\/'/);
  assert.match(read('student-learning-center.js'),/Wau Sakti: Pencarian Kata Indah/);
});
