import {
  CHECKPOINTS,
  INITIAL_CHECKLIST,
  INITIAL_DRAFT,
} from './data';
import {mergeMisi2Cloud} from './cloud';
import type {
  CheckpointMasteryRecord,
  FlightAttemptRecord,
  PersistedMission2State,
} from './types';

export const MISI2_STORAGE_KEY = 'hikayat_nusantara_misi2_state_v1'; // legacy, unowned
let accountStorageKey: string | null = null;
export function setMission2StorageAccount(id: string): void {
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))throw Error('Invalid pupil account');
  accountStorageKey=MISI2_STORAGE_KEY+'-account-'+id.toLowerCase();
}
export function hasLegacyMisi2Progress(): boolean {
  try {
    const raw=window.localStorage.getItem(MISI2_STORAGE_KEY);
    if(!raw)return false;
    const p=JSON.parse(raw);
    return p&&typeof p==='object'&&(p.missionCompleted===true||
      p.flightCompleted===true||p.tutorialCompleted===true||
      (Array.isArray(p.attemptHistory)&&p.attemptHistory.length>0)||
      (Array.isArray(p.collectedPhrases)&&p.collectedPhrases.length>0)||
      typeof p.draft?.permulaan==='string'&&p.draft.permulaan.trim().length>0);
  }catch{return false;}
}
export function importLegacyMisi2Progress(): boolean {
  if(!accountStorageKey||!hasLegacyMisi2Progress())return false;
  try{
    const existing=loadMission2State();
    const legacy=window.localStorage.getItem(MISI2_STORAGE_KEY);
    if(!legacy)return false;
    const parsed=JSON.parse(legacy) as PersistedMission2State;
    if(parsed.version!==1||!Array.isArray(parsed.attemptHistory)||!parsed.draft)return false;
    const combined=mergeMisi2Cloud(existing.state,parsed);
    const copy=JSON.stringify(combined);
    window.localStorage.setItem(accountStorageKey,copy);
    if(window.localStorage.getItem(accountStorageKey)!==copy)return false;
    // Source is removed only after a verified copy, to avoid sharing it with another pupil.
    window.localStorage.removeItem(MISI2_STORAGE_KEY);
    return true;
  }catch{return false;}
}

export function createInitialCheckpointRecords(): CheckpointMasteryRecord[] {
  return CHECKPOINTS.map((cp) => ({
    checkpointIndex: cp.index,
    firstAttemptCorrect: null,
    masteredAfterCorrection: false,
    attemptsUsed: 0,
  }));
}

export function createDefaultMission2State(): PersistedMission2State {
  return {
    version: 1,
    lastUpdated: Date.now(),
    savedPhase: 'title',
    mode: 'pengembara',
    quality: 'high',
    reducedMotion: false,
    use2DFallback: false,
    alternativeLanguagePath: false,
    tutorialCompleted: false,
    flightCompleted: false,
    collectedPhrases: [],
    checkpointRecords: createInitialCheckpointRecords(),
    flightScore: 0,
    lastRunStats: {
      timeRemaining: 120,
      heartsRemaining: 3,
      collisions: 0,
      checkpointsCleared: 0,
    },
    draft: { ...INITIAL_DRAFT },
    checklist: { ...INITIAL_CHECKLIST },
    reviewChecked: false,
    missionCompleted: false,
    xpAwarded: 0,
    badgeUnlocked: false,
    attemptHistory: [],
  };
}

export function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const probeKey = '__hikayat_misi2_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

export function loadMission2State(): {
  state: PersistedMission2State;
  hasSavedProgress: boolean;
  storageAvailable: boolean;
} {
  const storageAvailable = isLocalStorageAvailable();
  const fallback = createDefaultMission2State();
  if (!storageAvailable) {
    return { state: fallback, hasSavedProgress: false, storageAvailable: false };
  }

  try {
    const raw = accountStorageKey ? window.localStorage.getItem(accountStorageKey) : null;
    if (!raw) {
      return { state: fallback, hasSavedProgress: false, storageAvailable: true };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedMission2State>;
    const merged: PersistedMission2State = {
      ...fallback,
      ...parsed,
      draft: { ...INITIAL_DRAFT, ...(parsed.draft ?? {}) },
      checklist: { ...INITIAL_CHECKLIST, ...(parsed.checklist ?? {}) },
      checkpointRecords:
        Array.isArray(parsed.checkpointRecords) &&
        parsed.checkpointRecords.length === CHECKPOINTS.length
          ? parsed.checkpointRecords
          : createInitialCheckpointRecords(),
      attemptHistory: Array.isArray(parsed.attemptHistory)
        ? parsed.attemptHistory
        : [],
    };
    const hasSavedProgress =
      merged.tutorialCompleted ||
      merged.collectedPhrases.length > 0 ||
      merged.flightCompleted ||
      merged.attemptHistory.length > 0 ||
      Boolean(merged.draft.watakId) ||
      Boolean(merged.draft.permulaan.trim());

    return { state: merged, hasSavedProgress, storageAvailable: true };
  } catch {
    return { state: fallback, hasSavedProgress: false, storageAvailable };
  }
}

export function saveMission2State(state: PersistedMission2State): boolean {
  if (!isLocalStorageAvailable() || !accountStorageKey) return false;
  try {
    const payload: PersistedMission2State = {
      ...state,
      lastUpdated: Date.now(),
    };
    window.localStorage.setItem(accountStorageKey, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearMission2State(): boolean {
  if (!isLocalStorageAvailable() || !accountStorageKey) return false;
  try {
    window.localStorage.removeItem(accountStorageKey);
    return true;
  } catch {
    return false;
  }
}

export function computeCheckpointAccuracyStats(
  records: CheckpointMasteryRecord[],
): {
  firstTryCount: number;
  masteredCount: number;
  firstTryPct: number;
} {
  const answered = records.filter((r) => r.firstAttemptCorrect !== null);
  const firstTryCount = records.filter((r) => r.firstAttemptCorrect === true).length;
  const masteredCount = records.filter((r) => r.masteredAfterCorrection).length;
  const firstTryPct =
    answered.length > 0 ? Math.round((firstTryCount / CHECKPOINTS.length) * 100) : 0;

  return {
    firstTryCount,
    masteredCount,
    firstTryPct,
  };
}

export function appendAttemptRecord(
  history: FlightAttemptRecord[],
  record: FlightAttemptRecord,
): FlightAttemptRecord[] {
  if (history.some((item) => item.id === record.id)) {
    return history;
  }
  return [...history.slice(-14), record];
}
