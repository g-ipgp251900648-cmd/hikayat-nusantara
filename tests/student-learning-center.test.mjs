import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');

test('Ruang Murid mempunyai menu, objektif, graf dan jurnal dalam satu seksyen',()=>{
  const page=read('index.html');
  assert.match(page,/data-target="murid-pusat"/);
  assert.match(page,/id="murid-pusat"/);
  assert.match(page,/id="hn-lc-missions"/);
  assert.match(page,/id="hn-lc-chart"/);
  assert.match(page,/id="hn-lc-note"/);
  assert.match(page,/id="hn-lc-continue"/);
  assert.ok(page.indexOf('src="student-learning-center.js"')>page.indexOf('src="student-activities.js"'));
});

test('Pusat Pembelajaran menggunakan percubaan asal tanpa mereka skor',()=>{
  const code=read('student-learning-center.js');
  assert.match(code,/getStudentAttemptStats/);
  assert.match(code,/hikayat-nusantara-murid-demo-v2/);
  assert.match(code,/\[0,1,2,3\]/);
  assert.match(code,/slice\(-8\)/);
  assert.match(code,/history\[i\]/);
  assert.match(code,/window\.openStudentMission/);
  assert.match(code,/window\.addEventListener\('hikayat:attempt'/);
  assert.match(code,/window\.addEventListener\('hikayat:reset'/);
  assert.match(code,/localStorage\.setItem\(JOURNAL_KEY/);
  assert.match(code,/localStorage\.removeItem\(JOURNAL_KEY\)/);
  assert.match(code,/Catatan.*bukan dihantar kepada guru/);
});

test('Server dan proses build menyertakan fail Pusat Pembelajaran',()=>{
  assert.match(read('build.mjs'),/'student-learning-center.js'/);
  assert.match(read('server.js'),/\/student-learning-center\.js/);
  assert.match(read('styles.css'),/\.hn-lc-welcome/);
  assert.match(read('styles.css'),/@media\(max-width:640px\)/);
  const pkg=JSON.parse(read('package.json'));
  assert.match(pkg.scripts.check,/node --check student-learning-center\.js/);
});
