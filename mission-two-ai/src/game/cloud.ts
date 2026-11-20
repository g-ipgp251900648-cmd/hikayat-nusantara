import type {PersistedMission2State,FlightAttemptRecord} from './types';

// Game data are private to the currently logged-in pupil, never public or teacher readable.
const url='/api/student/misi2/state';
const phrases=['sinar keemasan menyelimuti desa','desa yang permai',
  'hembusan bayu menyapa dedaunan','hati yang tulus','cahaya harapan'];
const checklistKeys=[
  'watakDanLatar','peristiwaJelas','permulaanLengkap','perkembanganLengkap',
  'pengakhiranLengkap','duaUngkapanIndah','bacaSemulaSantun'
] as const;
export function mergeMisi2Cloud(
  local: PersistedMission2State,
  remote: PersistedMission2State | null
): PersistedMission2State {
  if(!remote)return local;
  const newer=remote.lastUpdated>=local.lastUpdated?remote:local;
  const older=newer===remote?local:remote;
  const merged:PersistedMission2State={
    ...newer,
    draft:{...newer.draft},
    lastRunStats:{...newer.lastRunStats},
    lastUpdated:Math.max(local.lastUpdated,remote.lastUpdated),
    tutorialCompleted:local.tutorialCompleted||remote.tutorialCompleted,
    flightCompleted:local.flightCompleted||remote.flightCompleted,
    reviewChecked:local.reviewChecked||remote.reviewChecked,
    missionCompleted:local.missionCompleted||remote.missionCompleted,
    badgeUnlocked:local.badgeUnlocked||remote.badgeUnlocked,
    flightScore:Math.max(local.flightScore,remote.flightScore),
    xpAwarded:Math.max(local.xpAwarded,remote.xpAwarded),
    collectedPhrases:phrases.filter(p=>local.collectedPhrases.includes(p)||remote.collectedPhrases.includes(p)),
    checkpointRecords:[0,1,2,3,4].map(i=>{
      const a=local.checkpointRecords[i],b=remote.checkpointRecords[i];
      return {checkpointIndex:i,
        firstAttemptCorrect:a?.firstAttemptCorrect===true||b?.firstAttemptCorrect===true?true:
          a?.firstAttemptCorrect===false||b?.firstAttemptCorrect===false?false:null,
        masteredAfterCorrection:Boolean(a?.masteredAfterCorrection||b?.masteredAfterCorrection),
        attemptsUsed:Math.max(a?.attemptsUsed||0,b?.attemptsUsed||0)};
    }),
    checklist:{...newer.checklist},
    attemptHistory:[]
  };
  const attempts=new Map<string,FlightAttemptRecord>();
  for(const entry of [...older.attemptHistory,...newer.attemptHistory])
    attempts.set(entry.id,entry);
  merged.attemptHistory=[...attempts.values()].sort((a,b)=>a.timestamp-b.timestamp).slice(-100);
  const hasStory=(s:PersistedMission2State)=>['permulaan','perkembangan','pengakhiran']
    .some(k=>s.draft[k as 'permulaan'|'perkembangan'|'pengakhiran'].trim().length>0);
  if(!hasStory(newer)&&hasStory(older))merged.draft={...older.draft};
  for(const k of checklistKeys)merged.checklist[k]=local.checklist[k]||remote.checklist[k];
  if(merged.missionCompleted){
    merged.xpAwarded=90;merged.badgeUnlocked=true;merged.savedPhase='victory';
  }
  return merged;
}
async function request(method:'GET'|'PUT',state?:PersistedMission2State){
  const response=await fetch(url,{
    method,credentials:'same-origin',cache:'no-store',
    ...(method==='PUT'?{headers:{'Content-Type':'application/json'},
      body:JSON.stringify({state:{...state,lastUpdated:Date.now()}})}:{})
  });
  if(!response.ok)throw Error('Misi 2 cloud unavailable: '+response.status);
  const result=await response.json();
  if(result.ok!==true)throw Error('Misi 2 cloud did not confirm storage');
  return result.state as PersistedMission2State|null;
}
export async function readMisi2Cloud():Promise<PersistedMission2State|null>{
  return request('GET');
}
export async function writeMisi2Cloud(state:PersistedMission2State):Promise<PersistedMission2State|null>{
  return request('PUT',state);
}
