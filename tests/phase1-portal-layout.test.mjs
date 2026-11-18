import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('admin preview has thirteen independently reachable menu entries', () => {
  const script = read('admin-dashboard.js');
  const ids = [
    'admin-ringkasan', 'admin-organisasi', 'admin-guru', 'admin-kelas',
    'admin-murid', 'admin-misi', 'admin-audit', 'admin-penghantaran',
    'admin-laporan', 'admin-media', 'admin-notifikasi',
    'admin-backup', 'admin-sistem'
  ];
  for (const id of ids) assert.ok(script.includes("'" + id + "'"), 'Missing ' + id);
  assert.match(script, /select\('admin-ringkasan',true\)/);
});

test('login screen is explicitly a non-authenticating design preview', () => {
  const html = read('login-preview.html');
  assert.match(html, /BUKAN LOG MASUK SEBENAR/);
  assert.match(html, /type="password"[^>]+disabled/);
  assert.match(html, /class="submit" disabled/);
  assert.doesNotMatch(html, /localStorage|sessionStorage|fetch\(/);
});

test('new files are available from the build and server without changing the student shell', () => {
  const html = read('index.html');
  const build = read('build.mjs');
  const server = read('server.js');
  const files = ['admin-dashboard.js', 'admin-dashboard.css', 'login-preview.html'];
  for (const file of files) {
    assert.ok(build.includes("'" + file + "'"), 'Missing build copy: ' + file);
    assert.ok(server.includes('"/' + file + '"'), 'Missing server route: ' + file);
  }
  assert.match(html, /<section class="view dashboard" id="murid-view"/);
  assert.match(html, /<script src="student-activities\.js" defer><\/script>/);
  assert.match(html, /<script src="mission-four-ai-bridge\.js" defer><\/script>/);
});
