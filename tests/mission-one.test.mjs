import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {join,dirname} from "node:path";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=name=>readFileSync(join(root,name),"utf8");

test("Misi 1 dibina dan dimuatkan selepas state aktiviti asal",()=>{
  const page=read("index.html");
  assert.ok(page.indexOf('src="student-activities.js"')>=0);
  assert.ok(page.indexOf('src="mission-one-3d.js"')>page.indexOf('src="student-activities.js"'));
  assert.ok(page.indexOf('src="student-progress.js"')>page.indexOf('src="mission-one-3d.js"'));
  assert.match(read("build.mjs"),/'mission-one-3d.js'/);
  assert.match(read("server.js"),/\/mission-one-3d\.js/);
});
test("Permainan mengandungi lima helaian, lima peristiwa, tiga soalan dan ganjaran demo",()=>{
  const code=read("mission-one-3d.js");
  assert.equal((code.match(/name:"(Rak Kitab|Peti Pusaka|Tingkap Berukir|Meja Penulisan|Pelita Warisan)"/g)||[]).length,5);
  assert.match(code,/const chapters=\[/);
  assert.match(code,/const events=\[/);
  assert.match(code,/const quiz=\[/);
  assert.match(code,/game\.found\.every\(Boolean\)/);
  assert.match(code,/game\.pages\.every\(Boolean\)/);
  assert.match(code,/game\.ordered/);
  assert.match(code,/submitMissionOneAdventure/);
  assert.match(code,/\+60 XP/);
});
test("Bukti semakan Misi 1 disahkan oleh modul aktiviti sebelum diberikan status selesai",()=>{
  const code=read("student-activities.js");
  assert.match(code,/window\.submitMissionOneAdventure=\(payload\)=>/);
  assert.match(code,/score===8/);
  assert.match(code,/recordAttempt\(0,score,8,success\)/);
  assert.match(code,/state\.completed\[0\]=true/);
});
test("Permainan menyokong pemasa dan kawalan audio serta 2D fallback",()=>{
  const code=read("mission-one-3d.js");
  assert.match(code,/remaining:600/);
  assert.match(code,/data-time="180"/);
  assert.match(code,/data-time="unlimited"/);
  assert.match(code,/webkitAudioContext/);
  assert.match(code,/fallback\.hidden=false/);
  assert.match(code,/window\.openStudentMission=index=>index===0\?open\(\)/);
  assert.match(read("styles.css"),/\.hn-m1-shell/);
});
