import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('Dashboard Guru begins with no fabricated student or class data', () => {
  const html = source('index.html');
  assert.match(html, /Jumlah murid<\/span><strong>0<\/strong><em>Belum ada murid berdaftar/);
  assert.match(html, /id="teacher-rows"><tr><td colspan="4">Belum ada karya murid/);
  assert.match(html, /Belum ada rekod kemajuan/);
  assert.doesNotMatch(html, /<strong>72%<\/strong>|<strong>30<\/strong>|5 Amanah · Demo/);
  assert.doesNotMatch(html, /\bMurid [ABC]\b/);
  assert.doesNotMatch(source('app.js'), /const examples\s*=\s*\{/);
});

test('Dashboard Admin has no fabricated teachers, classes, or KPIs', () => {
  const html = source('index.html');
  assert.match(html, /Belum ada akaun guru berdaftar/);
  assert.match(html, /Belum ada kelas yang didaftarkan/);
  assert.doesNotMatch(html, /<strong>120<\/strong>|<strong>96<\/strong>|<strong>06<\/strong>|<strong>04<\/strong>/);
  assert.doesNotMatch(html, /\bGuru [ABC]\b|Peratus kemajuan demonstrasi/);
});

test('No demo labels appear on visible portal pages', () => {
  const html = source('index.html');
  const app = source('app.js');
  const teacher = source('teacher-dashboard.js');
  const admin = source('admin-dashboard.js');
  const student = source('student-activities.js');
  assert.doesNotMatch(html, /\bdemo\b|demonstrasi|prototaip/i);
  assert.doesNotMatch(app, /\bdemo\b|demonstrasi|prototaip/i);
  assert.doesNotMatch(teacher, /\bdemo\b|demonstrasi|prototaip/i);
  assert.doesNotMatch(admin, /\bdemo\b|demonstrasi|prototaip/i);
  // LocalStorage keys are deliberately maintained for existing offline progress.
  const studentWithoutLegacyKey=student.replaceAll('hikayat-nusantara-murid-demo-v2','');
  assert.doesNotMatch(studentWithoutLegacyKey, /\bdemo\b|demonstrasi|prototaip/i);
});

test('Student progress data and all mission launchers are preserved', () => {
  const student = source('student-activities.js');
  const center = source('student-learning-center.js');
  assert.match(student, /hikayat-nusantara-murid-demo-v2/);
  assert.match(center, /hikayat-nusantara-murid-demo-v2/);
  assert.match(center, /hikayat-nusantara-refleksi-demo-v1/);
  for (const fn of ['openMissionOneAdventure','openMissionTwoAdventure','openMissionThreeAdventure','openMissionFourAdventure']) {
    assert.ok(student.includes(fn), 'missing launcher ' + fn);
  }
  assert.match(source('index.html'), /id="desa-hikayat-map"/);
});

test('Status badges keep their updated CSS selector', () => {
  assert.match(source('index.html'), /class="system-status-chip"/);
  assert.match(source('styles.css'), /\.system-status-chip/);
  assert.doesNotMatch(source('styles.css'), /\.demo-chip|\.demo-ribbon/);
});
