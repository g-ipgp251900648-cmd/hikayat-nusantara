import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
const txt=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Original uploaded AI Studio Misi 3 archive is byte-for-byte intact',()=>{
  const encoded=txt('mission-three-ai-original.tar.br.b64').trim();
  assert.match(encoded,/^[A-Za-z0-9+/]+={0,2}$/);
  const compressed=Buffer.from(encoded,'base64');
  assert.equal(createHash('sha256').update(compressed).digest('hex'),
    '405518ad67a3b62c061acfec602bca2b90c3d4389ecd99a63a6948f75a6e7355');
  const archive=brotliDecompressSync(compressed);
  const names=[];
  let p=0;
  while(p+512<=archive.length){
    const h=archive.subarray(p,p+512);
    if(h.every(x=>x===0))break;
    const name=h.subarray(0,100).toString().split('\0')[0];
    const size=parseInt(h.subarray(124,136).toString().split('\0')[0].trim()||'0',8);
    assert.match(name,/^[a-zA-Z0-9_./-]+$/);
    assert.ok(!name.split('/').includes('..'));
    assert.ok(Number.isInteger(size)&&size>=0);
    names.push(name);
    p+=512+Math.ceil(size/512)*512;
  }
  assert.equal(names.length,27);
  for(const name of [
    'index.html','vite.config.ts','src/App.tsx','src/main.tsx','src/index.css',
    'src/components/Garden3DCanvas.tsx','src/components/Fallback2DWorld.tsx',
    'src/components/minigames/BungaDiksiModal.tsx',
    'src/components/minigames/JambatanKataModal.tsx',
    'src/components/minigames/PelitaSantunModal.tsx',
    'src/components/minigames/CerminHikayatModal.tsx',
    'src/game/data.ts','src/game/rules.ts'
  ])assert.ok(names.includes(name),'Missing original '+name);
});

test('Original 3D Misi 3 launcher and score integration are wired',()=>{
  assert.match(txt('index.html'),/mission-three-ai-bridge\.js/);
  assert.match(txt('student-activities.js'),/window\.openMissionThreeAdventure/);
  assert.match(txt('student-activities.js'),/window\.submitMissionThreeAdventure/);
  assert.match(txt('student-activities.js'),/recordAttempt\(2,payload\.languageScore,12,true\)/);
  assert.match(txt('mission-three-ai-bridge.js'),/HIKAYAT_MISI3_COMPLETED/);
  assert.match(txt('mission-three-ai-bridge.js'),/event\.source !== iframe\.contentWindow/);
  assert.match(txt('mission-three-ai-bridge.js'),/src="\/misi3\/"/);
  assert.match(txt('build.mjs'),/extractMisiThreeSource/);
  assert.match(txt('build.mjs'),/mission-three-ai\/vite\.config\.ts/);
  assert.match(txt('server.js'),/pathname==='\/misi3'/);
  assert.match(txt('scripts/extract-misi3.mjs'),/brotliDecompressSync/);
});
