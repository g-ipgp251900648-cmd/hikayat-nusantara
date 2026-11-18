import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = file => readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('teacher dashboard exposes exactly 12 distinct sidebar menus in requested order',()=>{
  const app=source('teacher-dashboard.js');
  const start=app.indexOf('const sections = [');
  const end=app.indexOf('];',start);
  assert.ok(start>=0&&end>start);
  const menu=app.slice(start,end);
  const expected=[
    'Laman Utama','Pengurusan Murid','Pengurusan Kelas',
    'Pemantauan Empat Misi','Pengurusan Tugasan','Pusat Semakan Tugasan',
    'Pentaksiran PBD','Analisis Prestasi','Maklum Balas',
    'Portfolio Digital','Laporan dan Eksport','Tetapan Guru'
  ];
  const actual=[...menu.matchAll(/label:'([^']+)'/g)].map(m=>m[1]);
  assert.deepEqual(actual,expected);
  assert.equal(new Set(actual).size,12);
  assert.match(app,/const nav = document\.createElement\('nav'\)/);
  assert.match(app,/nav\.addEventListener\('click'/);
  assert.match(app,/section\.hidden=section\.id!==id/);
});

test('student and class management are standalone sections and keep old minimalist theme',()=>{
  const js=source('teacher-dashboard.js');
  assert.match(js,/wrapper\('guru-pengurusan-murid'/);
  assert.match(js,/wrapper\('guru-pengurusan-kelas'/);
  assert.match(js,/existingProgress\.id = 'guru-pemantauan'/);
  assert.match(js,/id="hn-add-student" disabled/);
  assert.match(js,/id="hn-add-class" disabled/);
  assert.match(js,/backend yang disahkan/);
  assert.match(js,/Kata laluan sementara/);
  assert.doesNotMatch(js,/(?:localStorage|sessionStorage)\.setItem/);
  const css=source('teacher-dashboard.css');
  assert.match(css,/var\(--paper\)/);
  assert.match(source('styles.css'),/--forest:/); // inherited palette for teacher theme
});

test('teacher dashboard assets are served and copied into production build',()=>{
  const html=source('index.html'),server=source('server.js'),build=source('build.mjs');
  for(const file of ['teacher-dashboard.js','teacher-dashboard.css']){
    assert.ok(html.includes('href="'+file+'"')||html.includes('src="'+file+'"'));
    assert.ok(server.includes('["/'+file+'"'));
    assert.ok(build.includes("'"+file+"'"));
  }
  const pkg=source('package.json');
  assert.match(pkg,/node --check teacher-dashboard\.js/);
});
