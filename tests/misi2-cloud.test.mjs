import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sanitizeMisi2,mergeMisi2} from '../auth/misi2-state.js';

function fixture(){
  return {
    version:1,lastUpdated:100,savedPhase:'title',mode:'pengembara',quality:'high',
    reducedMotion:false,use2DFallback:false,alternativeLanguagePath:false,
    tutorialCompleted:false,flightCompleted:false,collectedPhrases:[],
    checkpointRecords:[0,1,2,3,4].map(i=>({checkpointIndex:i,firstAttemptCorrect:null,masteredAfterCorrection:false,attemptsUsed:0})),
    flightScore:0,lastRunStats:{timeRemaining:120,heartsRemaining:3,collisions:0,checkpointsCleared:0},
    draft:{watakId:'',latarId:'',peristiwaId:'',useTemplate:true,permulaan:'',perkembangan:'',pengakhiran:''},
    checklist:{watakDanLatar:false,peristiwaJelas:false,permulaanLengkap:false,perkembanganLengkap:false,
      pengakhiranLengkap:false,duaUngkapanIndah:false,bacaSemulaSantun:false},
    reviewChecked:false,missionCompleted:false,xpAwarded:0,badgeUnlocked:false,attemptHistory:[]
  };
}
test('New device cannot erase already completed phone progress',()=>{
  const phone=fixture();
  phone.flightCompleted=true;phone.missionCompleted=true;phone.xpAwarded=90;
  phone.draft.permulaan='Pada zaman dahulu ada sebuah desa yang permai.';
  phone.collectedPhrases=['desa yang permai'];
  phone.checkpointRecords[0].masteredAfterCorrection=true;
  phone.attemptHistory=[{id:'run_1731000000000',timestamp:1731000000000,mode:'pengembara',
    completedFlight:true,checkpointsReached:5,firstTryAccuracyPct:80,masteredCount:5,
    collisions:0,heartsRemaining:3,timeUsedSeconds:60,alternativeLanguagePath:false}];
  const desktop=fixture();desktop.lastUpdated=200;
  const merged=mergeMisi2(sanitizeMisi2(phone),sanitizeMisi2(desktop));
  assert.equal(merged.missionCompleted,true);
  assert.equal(merged.xpAwarded,90);
  assert.equal(merged.draft.permulaan,phone.draft.permulaan);
  assert.equal(merged.attemptHistory.length,1);
  assert.equal(merged.checkpointRecords[0].masteredAfterCorrection,true);
  assert.deepEqual(merged.collectedPhrases,['desa yang permai']);
});
test('Two devices combine unique attempt histories without duplicating them',()=>{
  const phone=fixture(),desktop=fixture();
  const item={id:'run_1731000000000',timestamp:1731000000000,mode:'latihan',
    completedFlight:true,checkpointsReached:5,firstTryAccuracyPct:100,masteredCount:5,
    collisions:0,heartsRemaining:3,timeUsedSeconds:50,alternativeLanguagePath:false};
  phone.attemptHistory=[item];
  desktop.attemptHistory=[item,{...item,id:'run_1731000000001',timestamp:1731000000001}];
  const merged=mergeMisi2(sanitizeMisi2(phone),sanitizeMisi2(desktop));
  assert.deepEqual(merged.attemptHistory.map(x=>x.id),['run_1731000000000','run_1731000000001']);
});
test('Malformed input cannot be saved or expose arbitrary attributes',()=>{
  assert.equal(sanitizeMisi2({version:1,checkpointRecords:[],draft:{},checklist:{}}),null);
  const draft=fixture();draft.privateToken='forbidden';draft.attemptHistory=[{id:'bogus'}];
  const sanitized=sanitizeMisi2(draft);
  assert.equal(sanitized.privateToken,undefined);
  assert.equal(sanitized.attemptHistory.length,0);
});
test('Only authenticated pupils can read and write private game snapshots',()=>{
  const code=readFileSync(new URL('../auth/api.js',import.meta.url),'utf8');
  const schema=readFileSync(new URL('../auth/schema.sql',import.meta.url),'utf8');
  assert.match(code,/pathname==='\/api\/student\/misi2\/state'&&user\.role==='murid'/);
  assert.match(code,/WHERE student_id=\$1 AND organization_id=\$2/);
  assert.match(code,/pg_advisory_xact_lock/);
  assert.match(schema,/CREATE TABLE IF NOT EXISTS hn_misi2_game_state/);
  assert.match(schema,/student_id uuid PRIMARY KEY/);
});
