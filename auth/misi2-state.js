// Private Misi 2 cloud snapshot. Each record belongs to the logged-in pupil only.
// Never expose drafts to teachers, admins, public routes or another pupil.
const phrases=[
  'sinar keemasan menyelimuti desa','desa yang permai',
  'hembusan bayu menyapa dedaunan','hati yang tulus','cahaya harapan'
];
const keys=['watakDanLatar','peristiwaJelas','permulaanLengkap','perkembanganLengkap','pengakhiranLengkap','duaUngkapanIndah','bacaSemulaSantun'];
const modes=['latihan','pengembara','pahlawan'];
const phases=['title','briefing','tutorial','countdown','playing','checkpoint','paused','gameover','timeout','flight_success','balai_arrival','workshop','self_check','preview','victory'];
const scalar=(v,max=3500)=>typeof v==='string'?v.slice(0,max):'';
const bool=v=>v===true;
const num=(v,min,max)=>Number.isFinite(v)?Math.min(max,Math.max(min,v)):min;
const fresh=()=>({
  version:1,lastUpdated:0,savedPhase:'title',mode:'pengembara',
  quality:'high',reducedMotion:false,use2DFallback:false,
  alternativeLanguagePath:false,tutorialCompleted:false,flightCompleted:false,
  collectedPhrases:[],checkpointRecords:[],flightScore:0,
  lastRunStats:{timeRemaining:120,heartsRemaining:3,collisions:0,checkpointsCleared:0},
  draft:{watakId:'',latarId:'',peristiwaId:'',useTemplate:true,permulaan:'',perkembangan:'',pengakhiran:''},
  checklist:Object.fromEntries(keys.map(k=>[k,false])),
  reviewChecked:false,missionCompleted:false,xpAwarded:0,badgeUnlocked:false,attemptHistory:[]
});
const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function sanitizeMisi2(value){
  if(!isObj(value)||value.version!==1||!Array.isArray(value.checkpointRecords)||
      !Array.isArray(value.attemptHistory)||!isObj(value.draft)||!isObj(value.checklist)||
      !Array.isArray(value.collectedPhrases))return null;
  const x=fresh();
  x.lastUpdated=num(value.lastUpdated,0,Date.now()+86400000);
  x.savedPhase=phases.includes(value.savedPhase)?value.savedPhase:'title';
  x.mode=modes.includes(value.mode)?value.mode:'pengembara';
  x.quality=['low','medium','high'].includes(value.quality)?value.quality:'high';
  for(const k of ['reducedMotion','use2DFallback','alternativeLanguagePath','tutorialCompleted',
    'flightCompleted','reviewChecked','missionCompleted','badgeUnlocked'])x[k]=bool(value[k]);
  x.collectedPhrases=phrases.filter(p=>value.collectedPhrases.includes(p));
  x.checkpointRecords=[0,1,2,3,4].map(i=>{
    const p=value.checkpointRecords.find(v=>isObj(v)&&v.checkpointIndex===i)||{};
    return {checkpointIndex:i,firstAttemptCorrect:typeof p.firstAttemptCorrect==='boolean'?p.firstAttemptCorrect:null,
      masteredAfterCorrection:bool(p.masteredAfterCorrection),attemptsUsed:num(p.attemptsUsed,0,10000)};
  });
  x.flightScore=num(value.flightScore,0,1000000);
  if(isObj(value.lastRunStats))for(const [k,max] of [['timeRemaining',3600],['heartsRemaining',100],['collisions',10000],['checkpointsCleared',5]])
    x.lastRunStats[k]=num(value.lastRunStats[k],0,max);
  for(const k of ['watakId','latarId','peristiwaId'])x.draft[k]=scalar(value.draft[k],80);
  for(const k of ['permulaan','perkembangan','pengakhiran'])x.draft[k]=scalar(value.draft[k]);
  x.draft.useTemplate=value.draft.useTemplate!==false;
  for(const k of keys)x.checklist[k]=bool(value.checklist[k]);
  x.xpAwarded=num(value.xpAwarded,0,90);
  x.attemptHistory=value.attemptHistory.filter(v=>isObj(v)&&typeof v.id==='string'&&/^(run|alt)_[0-9]{8,17}$/.test(v.id))
    .slice(-100).map(v=>({
      id:v.id,timestamp:num(v.timestamp,0,Date.now()+86400000),
      mode:modes.includes(v.mode)?v.mode:'pengembara',
      completedFlight:bool(v.completedFlight),checkpointsReached:num(v.checkpointsReached,0,5),
      firstTryAccuracyPct:num(v.firstTryAccuracyPct,0,100),masteredCount:num(v.masteredCount,0,5),
      collisions:num(v.collisions,0,10000),heartsRemaining:num(v.heartsRemaining,0,100),
      timeUsedSeconds:num(v.timeUsedSeconds,0,3600),
      alternativeLanguagePath:bool(v.alternativeLanguagePath)
    }));
  return x;
}
export function mergeMisi2(a,b){
  if(!a)return b;if(!b)return a;
  const incomingNewer=b.lastUpdated>=a.lastUpdated;
  const newer=incomingNewer?b:a, older=incomingNewer?a:b;
  const x=structuredClone(newer);
  x.lastUpdated=Math.max(a.lastUpdated,b.lastUpdated);
  for(const k of ['tutorialCompleted','flightCompleted','missionCompleted','badgeUnlocked','reviewChecked'])
    x[k]=bool(a[k])||bool(b[k]);
  x.xpAwarded=Math.max(a.xpAwarded,b.xpAwarded);
  if(x.missionCompleted){x.xpAwarded=90;x.badgeUnlocked=true;x.savedPhase='victory';}
  x.flightScore=Math.max(a.flightScore,b.flightScore);
  x.collectedPhrases=phrases.filter(p=>a.collectedPhrases.includes(p)||b.collectedPhrases.includes(p));
  x.checkpointRecords=[0,1,2,3,4].map(i=>{
    const v=a.checkpointRecords[i],w=b.checkpointRecords[i];
    return {checkpointIndex:i,
      firstAttemptCorrect:v.firstAttemptCorrect===true||w.firstAttemptCorrect===true?true:
        v.firstAttemptCorrect===false||w.firstAttemptCorrect===false?false:null,
      masteredAfterCorrection:bool(v.masteredAfterCorrection)||bool(w.masteredAfterCorrection),
      attemptsUsed:Math.max(v.attemptsUsed,w.attemptsUsed)};
  });
  const attempts=new Map();
  for(const item of [...older.attemptHistory,...newer.attemptHistory])attempts.set(item.id,item);
  x.attemptHistory=[...attempts.values()].sort((a,b)=>a.timestamp-b.timestamp).slice(-100);
  // Never overwrite an existing pupil's story with a blank draft from a fresh device.
  const hasText=d=>['permulaan','perkembangan','pengakhiran'].some(k=>d[k].trim().length>0);
  if(!hasText(newer.draft)&&hasText(older.draft))x.draft=older.draft;
  for(const k of keys)x.checklist[k]=bool(a.checklist[k])||bool(b.checklist[k]);
  return x;
}
