import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Compass,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Wind,
} from 'lucide-react';
import { malayAudio } from './audio/malayAudio';
import { AssessmentModal } from './components/AssessmentModal';
import { AudioControls } from './components/AudioControls';
import { CheckpointModal } from './components/CheckpointModal';
import { FlightHUD } from './components/FlightHUD';
import { WorldViewport2D } from './components/WorldViewport2D';
import {
  type FlightHudSnapshot,
  WorldViewport3D,
} from './components/WorldViewport3D';
import { WritingWorkshop } from './components/WritingWorkshop';
import {
  CHECKPOINTS,
  DIFFICULTY_CONFIGS,
  FLIGHT_ZONES,
} from './game/data';
import {
  appendAttemptRecord,
  clearMission2State,
  computeCheckpointAccuracyStats,
  createDefaultMission2State,
  createInitialCheckpointRecords,
  loadMission2State,
  saveMission2State,
  setMission2StorageAccount,
  hasLegacyMisi2Progress,
  importLegacyMisi2Progress,
} from './game/storage';
import type {
  CheckpointOption,
  DifficultyMode,
  GamePhase,
  GraphicsQuality,
  PersistedMission2State,
  SelfChecklistState,
  StoryDraft,
} from './game/types';
import { awardMissionXpOnce, canCompleteMission } from './game/writing';
import {mergeMisi2Cloud,readMisi2Cloud,writeMisi2Cloud} from './game/cloud';

function mapPhaseToBodyDataset(
  phase: GamePhase,
): 'title' | 'playing' | 'paused' | 'gameover' {
  if (phase === 'title' || phase === 'briefing') return 'title';
  if (phase === 'paused') return 'paused';
  if (phase === 'gameover' || phase === 'timeout' || phase === 'victory') {
    return 'gameover';
  }
  return 'playing';
}

// Same-origin events to Hikayat Nusantara Portal. No remote account or API.
// Only assessment evidence for this local demo is sent to the parent window.
function notifyHikayatPortal(eventType: 'attempt' | 'victory' | 'sync', payload: unknown) {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage({
    source: 'hikayat-misi2-aistudio-original',
    version: 1,
    eventType,
    payload,
  }, window.location.origin);
}

export default function App() {
  const initialLoaded = useRef(loadMission2State());
  const [persisted, setPersisted] = useState<PersistedMission2State>(
    initialLoaded.current.state,
  );
  const [hasSavedProgress, setHasSavedProgress] = useState<boolean>(
    initialLoaded.current.hasSavedProgress,
  );
  const [storageAvailable] = useState<boolean>(
    initialLoaded.current.storageAvailable,
  );

  // Determine initial phase (supports ?autostart=1 for instant play)
  const [phase, setPhase] = useState<GamePhase>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [runNonce, setRunNonce] = useState(1);
  const [countdownValue, setCountdownValue] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [hearts, setHearts] = useState(3);
  const [collisions, setCollisions] = useState(0);
  const [activeCheckpointIdx, setActiveCheckpointIdx] = useState<number>(0);
  const [completedCheckpoints, setCompletedCheckpoints] = useState<number[]>([]);
  const [tutorialFinished, setTutorialFinished] = useState(false);
  const [alternativePathActive, setAlternativePathActive] = useState(false);

  const [hudSnapshot, setHudSnapshot] = useState<FlightHudSnapshot>({
    worldX: 0,
    zoneIndex: 0,
    progressPct: 0,
    hearts: 3,
    score: 0,
    invulnerable: false,
  });

  const [hangTuahTip, setHangTuahTip] = useState(
    'Tekan Space atau sentuh skrin untuk menaikkan wau. Lepaskan kawalan untuk menurunkannya secara perlahan.',
  );

  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Audio state mirrored to UI
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.55);

  const isLiftingRef = useRef(false);
  const scoreRef = useRef(0);
  const attemptIdRef = useRef<string>(`run_${Date.now()}`);

  // Sync body dataset state
  useEffect(() => {
    document.body.dataset.state = mapPhaseToBodyDataset(phase);
  }, [phase]);

  // Sync Audio mood whenever phase changes (if unlocked by user gesture)
  useEffect(() => {
    if (!malayAudio.isUnlocked()) return;
    if (phase === 'title' || phase === 'briefing') {
      malayAudio.setMood('garden');
    } else if (
      phase === 'tutorial' ||
      phase === 'countdown' ||
      phase === 'playing'
    ) {
      malayAudio.setMood('flight');
    } else if (phase === 'checkpoint') {
      malayAudio.setMood('checkpoint');
    } else if (phase === 'paused') {
      malayAudio.pause();
      setMusicPlaying(false);
    } else if (
      phase === 'balai_arrival' ||
      phase === 'workshop' ||
      phase === 'self_check' ||
      phase === 'preview'
    ) {
      malayAudio.setMood('balai');
    } else if (phase === 'victory') {
      malayAudio.setMood('victory');
    }
  }, [phase]);

  // Fetch the pupil's private Neon snapshot on opening. Never replace the local
  // game with a blank record from a newly used phone/computer.
  const [accountId,setAccountId]=useState<string|null>(null);
  const [storageReady,setStorageReady]=useState(false);
  const [legacyImportAvailable,setLegacyImportAvailable]=useState(false);
  const [cloudReady,setCloudReady]=useState(false);
  const [cloudStatus,setCloudStatus]=useState('Menyemak rekod Misi 2...');
  const bootCloud=useCallback(async()=>{
    try{
      const remote=await readMisi2Cloud();
      if(remote)setPersisted(prev=>mergeMisi2Cloud(prev,remote));
      setCloudReady(true);
      setCloudStatus('Rekod peranti sedang diselaraskan.');
    }catch{
      setCloudReady(false);
      setCloudStatus('Rekod disimpan pada peranti. Penyelarasan Neon belum tersedia.');
    }
  },[]);
  useEffect(()=>{
    let active=true;
    void (async()=>{
      try{
        const res=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});
        const session=await res.json();
        if(!res.ok||session?.authenticated!==true||session.user?.role!=='murid'||
          typeof session.user?.id!=='string')throw Error('SESSION_REQUIRED');
        if(!active)return;
        setMission2StorageAccount(session.user.id);
        const local=loadMission2State();
        setPersisted(local.state);
        setHasSavedProgress(local.hasSavedProgress);
        setLegacyImportAvailable(!local.hasSavedProgress&&hasLegacyMisi2Progress());
        setAccountId(session.user.id);
        setStorageReady(true);
        await bootCloud();
      }catch{
        if(active)setCloudStatus('Sila log masuk sebagai Murid untuk membuka rekod permainan.');
      }
    })();
    const online=()=>{if(active&&storageReady)void bootCloud();};
    window.addEventListener('online',online);
    return ()=>{active=false;window.removeEventListener('online',online);};
  },[bootCloud]);
  // Save the actual game state, including checkpoint and graph data, after
  // successful initialization. Every upload is merged under a DB transaction.
  useEffect(()=>{
    if(!cloudReady||!accountId||!storageReady)return;
    let active=true;
    const timer=window.setTimeout(()=>{
      void (async()=>{
        try{
          const remote=await writeMisi2Cloud(persisted,accountId);
          if(!active)return;
          if(remote)setPersisted(prev=>{
            const combined=mergeMisi2Cloud(prev,remote);
            const withoutTime=(v:PersistedMission2State)=>JSON.stringify({...v,lastUpdated:0});
            return withoutTime(combined)===withoutTime(prev)?prev:combined;
          });
          setCloudStatus('✓ Kemajuan Misi 2 disimpan dalam Neon.');
        }catch{
          if(active)setCloudStatus('Belum dapat menyegerakkan Neon. Rekod telefon/komputer masih tersimpan.');
        }
      })();
    },1350);
    return ()=>{active=false;window.clearTimeout(timer);};
  },[persisted,cloudReady,accountId,storageReady]);

  useEffect(()=>{
    notifyHikayatPortal('sync',{status:cloudStatus});
  },[cloudStatus]);

  // Debounced auto-save to localStorage
  useEffect(() => {
    if(!storageReady)return;
    const id = window.setTimeout(() => {
      const ok = saveMission2State(persisted);
      if (ok) {
        const hasData =
          persisted.tutorialCompleted ||
          persisted.collectedPhrases.length > 0 ||
          persisted.flightCompleted ||
          Boolean(persisted.draft.watakId) ||
          Boolean(persisted.draft.permulaan.trim());
        setHasSavedProgress(hasData);
      }
    }, 350);
    return () => window.clearTimeout(id);
  }, [persisted,storageReady]);

  const recordAttemptSummary = useCallback(
    (completedFlight: boolean, cpReached: number, nextCollisions: number, nextHearts: number, nextTimeRem: number) => {
      setPersisted((prev) => {
        const cfg = DIFFICULTY_CONFIGS[prev.mode];
        const stats = computeCheckpointAccuracyStats(prev.checkpointRecords);
        const timeUsed = cfg.hasTimer
          ? Math.max(1, Math.round(cfg.timerSeconds - nextTimeRem))
          : 0;
        const nextHistory = appendAttemptRecord(prev.attemptHistory, {
          id: attemptIdRef.current,
          timestamp: Date.now(),
          mode: prev.mode,
          completedFlight,
          checkpointsReached: cpReached,
          firstTryAccuracyPct: stats.firstTryPct,
          masteredCount: stats.masteredCount,
          collisions: nextCollisions,
          heartsRemaining: nextHearts,
          timeUsedSeconds: timeUsed,
          alternativeLanguagePath: alternativePathActive,
        });
        return {
          ...prev,
          flightScore: Math.max(prev.flightScore, Math.round(scoreRef.current)),
          lastRunStats: {
            timeRemaining: nextTimeRem,
            heartsRemaining: nextHearts,
            collisions: nextCollisions,
            checkpointsCleared: cpReached,
          },
          attemptHistory: nextHistory,
        };
      });
    },
    [alternativePathActive],
  );

  // Share completed flight-attempt summaries with the existing Misi 2 portal.
  // Sending old records after re-opening is safe: the parent deduplicates IDs.
  useEffect(() => {
    for (const record of persisted.attemptHistory) {
      notifyHikayatPortal('attempt', {
        id: record.id,
        completedFlight: record.completedFlight,
        masteredCount: record.masteredCount,
        firstTryAccuracyPct: record.firstTryAccuracyPct,
        checkpointsReached: record.checkpointsReached,
        alternativeLanguagePath: record.alternativeLanguagePath,
      });
    }
  }, [persisted.attemptHistory]);

  // Synchronise the language/writing evidence after the original game awards XP.
  // The parent checks every requirement independently before unlocking Misi 3.
  useEffect(() => {
    if (!persisted.missionCompleted) return;
    notifyHikayatPortal('victory', {
      flightCompleted: persisted.flightCompleted,
      collectedPhrases: persisted.collectedPhrases,
      checkpointRecords: persisted.checkpointRecords.map(record => ({
        checkpointIndex: record.checkpointIndex,
        masteredAfterCorrection: record.masteredAfterCorrection,
      })),
      draft: {
        watakId: persisted.draft.watakId,
        latarId: persisted.draft.latarId,
        peristiwaId: persisted.draft.peristiwaId,
        permulaan: persisted.draft.permulaan.slice(0, 3500),
        perkembangan: persisted.draft.perkembangan.slice(0, 3500),
        pengakhiran: persisted.draft.pengakhiran.slice(0, 3500),
      },
      checklist: persisted.checklist,
    });
  }, [persisted.missionCompleted]);

  const importOldMisi2=()=>{
    if(!confirm('Adakah rekod Misi 2 lama dalam pelayar ini benar-benar milik akaun murid yang sedang log masuk? Jangan import jika peranti ini dikongsi dan rekod milik orang lain.'))return;
    if(!importLegacyMisi2Progress()){
      setCloudStatus('Import belum berjaya. Rekod lama tidak dipadam.');
      return;
    }
    const imported=loadMission2State();
    setPersisted(prev=>mergeMisi2Cloud(prev,imported.state));
    setHasSavedProgress(imported.hasSavedProgress);
    setLegacyImportAvailable(false);
    setCloudStatus('Rekod lama berjaya diimport. Menyelaraskan ke Neon...');
  };

  // Main Countdown ("3, 2, 1, TERBANG!") -> starts 120s timer ONLY after countdown ends
  useEffect(() => {
    if (phase !== 'countdown') return;
    setCountdownValue(3);
    const t1 = window.setTimeout(() => setCountdownValue(2), 750);
    const t2 = window.setTimeout(() => setCountdownValue(1), 1500);
    const t3 = window.setTimeout(() => setCountdownValue(0), 2250);
    const t4 = window.setTimeout(() => {
      setPhase('playing');
      setHangTuahTip(
        'Terbang merentasi lima kawasan menuju Balai Olah Hikayat! Elakkan halangan dan singgah di lima Gerbang Bahasa.',
      );
    }, 2800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [phase]);

  // 120-Second Timer (runs ONLY during active 'playing' phase when mode has timer)
  useEffect(() => {
    const cfg = DIFFICULTY_CONFIGS[persisted.mode];
    if (phase !== 'playing' || !cfg.hasTimer) return;

    const interval = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          isLiftingRef.current = false;
          setPhase('timeout');
          recordAttemptSummary(
            false,
            completedCheckpoints.length,
            collisions,
            hearts,
            0,
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    phase,
    persisted.mode,
    completedCheckpoints.length,
    collisions,
    hearts,
    recordAttemptSummary,
  ]);

  const startFlightRun = useCallback(
    (modeToUse: DifficultyMode, skipTutorial: boolean) => {
      malayAudio.unlockFromUserGesture('flight');
      setMusicPlaying(malayAudio.isPlaying());
      const cfg = DIFFICULTY_CONFIGS[modeToUse];
      attemptIdRef.current = `run_${Date.now()}`;
      scoreRef.current = 0;
      setAlternativePathActive(false);
      setTimeRemaining(cfg.timerSeconds || 120);
      setHearts(cfg.maxHearts);
      setCollisions(0);
      setCompletedCheckpoints([]);
      setTutorialFinished(false);
      isLiftingRef.current = false;
      setHudSnapshot({
        worldX: 0,
        zoneIndex: 0,
        progressPct: 0,
        hearts: cfg.maxHearts,
        score: 0,
        invulnerable: false,
      });

      setPersisted((prev) => ({
        ...prev,
        mode: modeToUse,
        savedPhase: skipTutorial ? 'playing' : 'tutorial',
        checkpointRecords: createInitialCheckpointRecords(),
      }));

      setRunNonce((n) => n + 1);

      if (skipTutorial) {
        setPhase('countdown');
      } else {
        setHangTuahTip(
          'Tekan Space atau sentuh skrin untuk menaikkan wau. Lepaskan kawalan untuk menurunkannya secara perlahan.',
        );
        setPhase('tutorial');
      }
    },
    [],
  );

  // Global keyboard bindings & focus-loss release hygiene
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Never hijack typing inside textarea/inputs
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'TEXTAREA' ||
          target.tagName === 'INPUT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (phase === 'title') {
          e.preventDefault();
          malayAudio.unlockFromUserGesture('garden');
          setMusicPlaying(malayAudio.isPlaying());
          setPhase('briefing');
          return;
        }
        if (phase === 'playing' || phase === 'tutorial') {
          e.preventDefault();
          if (!isLiftingRef.current) {
            malayAudio.playLiftSfx();
          }
          isLiftingRef.current = true;
        }
      } else if (e.code === 'Enter' && phase === 'title') {
        e.preventDefault();
        malayAudio.unlockFromUserGesture('garden');
        setMusicPlaying(malayAudio.isPlaying());
        setPhase('briefing');
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (phase === 'playing') {
          e.preventDefault();
          isLiftingRef.current = false;
          setPhase('paused');
        } else if (phase === 'paused') {
          e.preventDefault();
          malayAudio.play();
          setMusicPlaying(true);
          setPhase('playing');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        isLiftingRef.current = false;
      }
    };

    const clearInputs = () => {
      isLiftingRef.current = false;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        isLiftingRef.current = false;
        malayAudio.pause();
        setMusicPlaying(false);
        if (phase === 'playing') {
          setPhase('paused');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [phase]);

  const handleHudTick = useCallback((snap: FlightHudSnapshot) => {
    scoreRef.current = snap.score;
    setHudSnapshot(snap);
  }, []);

  const handleObstaclePassed = useCallback((points: number) => {
    scoreRef.current += points;
    if (scoreRef.current % 40 === 0) {
      setHangTuahTip('Bagus! Kawalan Wau Sakti kamu semakin stabil dan lancar.');
    }
  }, []);

  const handleCollisionHit = useCallback(() => {
    malayAudio.playCollisionBump();
    setCollisions((prevC) => {
      const nextC = prevC + 1;
      setHearts((prevH) => {
        const nextH = Math.max(0, prevH - 1);
        if (nextH === 0) {
          isLiftingRef.current = false;
          setPhase('gameover');
          recordAttemptSummary(
            false,
            completedCheckpoints.length,
            nextC,
            0,
            timeRemaining,
          );
        } else {
          setHangTuahTip(
            'Perhatikan ruang di hadapan! Tekan perlahan untuk menaikkan wau dan lepaskan apabila mahu menurunkannya.',
          );
        }
        return nextH;
      });
      return nextC;
    });
  }, [completedCheckpoints.length, recordAttemptSummary, timeRemaining]);

  const handleCheckpointReached = useCallback((checkpointIdx: number) => {
    isLiftingRef.current = false;
    setActiveCheckpointIdx(checkpointIdx);
    setPhase('checkpoint');
  }, []);

  const handleAttemptCheckpointOption = useCallback(
    (option: CheckpointOption, attemptNum: number) => {
      if (option.isCorrect) {
        malayAudio.playGamelanCorrect();
        const cp = CHECKPOINTS[activeCheckpointIdx];
        setPersisted((prev) => {
          const alreadyCollected = prev.collectedPhrases.includes(cp.phrase);
          const nextPhrases = alreadyCollected
            ? prev.collectedPhrases
            : [...prev.collectedPhrases, cp.phrase];

          const nextRecords = prev.checkpointRecords.map((rec) => {
            if (rec.checkpointIndex !== cp.index) return rec;
            return {
              ...rec,
              firstAttemptCorrect:
                rec.firstAttemptCorrect === null
                  ? attemptNum === 1
                  : rec.firstAttemptCorrect,
              masteredAfterCorrection: true,
              attemptsUsed: rec.attemptsUsed + attemptNum,
            };
          });

          return {
            ...prev,
            collectedPhrases: nextPhrases,
            checkpointRecords: nextRecords,
          };
        });

        setCompletedCheckpoints((prev) =>
          prev.includes(cp.index) ? prev : [...prev, cp.index],
        );
      } else {
        malayAudio.playGentleTryAgain();
        setPersisted((prev) => ({
          ...prev,
          checkpointRecords: prev.checkpointRecords.map((rec) =>
            rec.checkpointIndex === activeCheckpointIdx &&
            rec.firstAttemptCorrect === null
              ? { ...rec, firstAttemptCorrect: false }
              : rec,
          ),
        }));
      }
    },
    [activeCheckpointIdx],
  );

  const handleContinueAfterCheckpoint = useCallback(() => {
    if (alternativePathActive) {
      if (activeCheckpointIdx < CHECKPOINTS.length - 1) {
        setActiveCheckpointIdx((prev) => prev + 1);
      } else {
        setPersisted((prev) => ({
          ...prev,
          flightCompleted: true,
          savedPhase: 'balai_arrival',
        }));
        recordAttemptSummary(true, CHECKPOINTS.length, 0, hearts, timeRemaining);
        setPhase('balai_arrival');
      }
      return;
    }

    setPhase('playing');
    if (activeCheckpointIdx === CHECKPOINTS.length - 1) {
      setHangTuahTip(
        'Kelima-lima ungkapan telah diperoleh! Teruskan ke hadapan untuk memasuki Gerbang Balai Olah Hikayat!',
      );
    } else {
      const nextZone = FLIGHT_ZONES[activeCheckpointIdx + 1];
      setHangTuahTip(
        `Gerbang terbuka! Kini kita memasuki kawasan ${nextZone?.name || 'seterusnya'}.`,
      );
    }
  }, [
    activeCheckpointIdx,
    alternativePathActive,
    hearts,
    recordAttemptSummary,
    timeRemaining,
  ]);

  const handleFinalGateReached = useCallback(() => {
    isLiftingRef.current = false;
    malayAudio.playGamelanCorrect();
    scoreRef.current += 100;
    setPersisted((prev) => ({
      ...prev,
      flightCompleted: true,
      savedPhase: 'balai_arrival',
    }));
    recordAttemptSummary(
      true,
      CHECKPOINTS.length,
      collisions,
      hearts,
      timeRemaining,
    );
    setPhase('flight_success');
  }, [collisions, hearts, recordAttemptSummary, timeRemaining]);

  const handleOpenAlternativeLanguagePath = useCallback(() => {
    malayAudio.unlockFromUserGesture('checkpoint');
    setMusicPlaying(malayAudio.isPlaying());
    attemptIdRef.current = `alt_${Date.now()}`;
    setAlternativePathActive(true);
    setActiveCheckpointIdx(0);
    setCompletedCheckpoints([]);
    setPersisted((prev) => ({
      ...prev,
      alternativeLanguagePath: true,
      checkpointRecords: createInitialCheckpointRecords(),
    }));
    setPhase('checkpoint');
  }, []);

  const handleResumeSaved = useCallback(() => {
    malayAudio.unlockFromUserGesture(
      persisted.flightCompleted ? 'balai' : 'garden',
    );
    setMusicPlaying(malayAudio.isPlaying());
    if (persisted.flightCompleted) {
      setPhase(persisted.missionCompleted ? 'victory' : 'workshop');
    } else {
      setPhase('briefing');
    }
  }, [persisted.flightCompleted, persisted.missionCompleted]);

  const handleConfirmReset = useCallback(() => {
    clearMission2State();
    const fresh = createDefaultMission2State();
    setPersisted(fresh);
    setHasSavedProgress(false);
    setConfirmResetOpen(false);
    setCompletedCheckpoints([]);
    setPhase('briefing');
  }, []);

  const isWorkshopStage =
    phase === 'balai_arrival' ||
    phase === 'workshop' ||
    phase === 'self_check' ||
    phase === 'preview' ||
    phase === 'victory';

  const isFlightStage =
    phase === 'tutorial' ||
    phase === 'countdown' ||
    phase === 'playing' ||
    phase === 'paused' ||
    phase === 'gameover' ||
    phase === 'timeout' ||
    phase === 'flight_success' ||
    (phase === 'checkpoint' && !alternativePathActive);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#1c140d]">
      {!storageReady&&(
        <div className="absolute inset-0 z-[900] flex items-center justify-center bg-stone-950/85 text-amber-100 p-5 text-center">
          <p role="status">{cloudStatus}</p>
        </div>
      )}
      {storageReady&&legacyImportAvailable&&(
        <aside className="absolute top-3 left-3 right-3 z-[850] mx-auto max-w-xl rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-stone-900 shadow-xl">
          <strong>Rekod Misi 2 lama ditemui pada peranti ini</strong>
          <p className="mt-1 mb-3 text-sm">Import hanya jika rekod ini milik akaun murid yang sedang log masuk. Rekod permainan dalam akaun murid lain tidak boleh diimport.</p>
          <button type="button" onClick={importOldMisi2} className="rounded-lg bg-emerald-800 px-4 py-2 text-white font-semibold">Import Rekod Lama Saya</button>
          <button type="button" onClick={()=>setLegacyImportAvailable(false)} className="ml-3 rounded-lg border border-stone-300 px-4 py-2">Bukan Rekod Saya</button>
        </aside>
      )}
      {/* Persistent 3D or 2D World Viewport */}
      {persisted.use2DFallback ? (
        <WorldViewport2D
          phase={phase}
          mode={persisted.mode}
          runNonce={runNonce}
          hearts={hearts}
          completedCheckpoints={completedCheckpoints}
          isLiftingRef={isLiftingRef}
          onHudTick={handleHudTick}
          onObstaclePassed={handleObstaclePassed}
          onCollisionHit={handleCollisionHit}
          onCheckpointReached={handleCheckpointReached}
          onTutorialComplete={() => {
            isLiftingRef.current = false;
            setTutorialFinished(true);
            setPersisted((p) => ({ ...p, tutorialCompleted: true }));
          }}
          onFinalGateReached={handleFinalGateReached}
        />
      ) : (
        <WorldViewport3D
          phase={phase}
          mode={persisted.mode}
          quality={persisted.quality}
          reducedMotion={persisted.reducedMotion}
          runNonce={runNonce}
          hearts={hearts}
          completedCheckpoints={completedCheckpoints}
          isLiftingRef={isLiftingRef}
          onHudTick={handleHudTick}
          onObstaclePassed={handleObstaclePassed}
          onCollisionHit={handleCollisionHit}
          onCheckpointReached={handleCheckpointReached}
          onTutorialComplete={() => {
            isLiftingRef.current = false;
            setTutorialFinished(true);
            setPersisted((p) => ({ ...p, tutorialCompleted: true }));
          }}
          onFinalGateReached={handleFinalGateReached}
          onWebGLUnsupported={() =>
            setPersisted((prev) => ({ ...prev, use2DFallback: true }))
          }
        />
      )}

      {/* Top-Right Global Audio & Display Controls */}
      <div className="fixed top-3 right-3 sm:top-5 sm:right-5 z-40">
        <AudioControls
          musicPlaying={musicPlaying}
          muted={muted}
          volume={volume}
          quality={persisted.quality}
          reducedMotion={persisted.reducedMotion}
          use2DFallback={persisted.use2DFallback}
          onTogglePlayMusic={() => {
            if (malayAudio.isPlaying()) {
              malayAudio.pause();
              setMusicPlaying(false);
            } else {
              malayAudio.unlockFromUserGesture(
                isWorkshopStage ? 'balai' : isFlightStage ? 'flight' : 'garden',
              );
              malayAudio.play();
              setMusicPlaying(true);
            }
          }}
          onToggleMute={() => {
            const next = !muted;
            setMuted(next);
            malayAudio.setMuted(next);
          }}
          onVolumeChange={(v) => {
            setVolume(v);
            malayAudio.setVolume(v);
          }}
          onQualityChange={(q: GraphicsQuality) =>
            setPersisted((prev) => ({ ...prev, quality: q }))
          }
          onToggleReducedMotion={() =>
            setPersisted((prev) => ({
              ...prev,
              reducedMotion: !prev.reducedMotion,
            }))
          }
          onToggle2DFallback={() =>
            setPersisted((prev) => ({
              ...prev,
              use2DFallback: !prev.use2DFallback,
            }))
          }
        />
      </div>

      {/* PHASE: TITLE / TAMAN WAU WARISAN OPENING */}
      {phase === 'title' && (
        <div className="fixed inset-0 z-20 flex flex-col justify-between p-5 sm:p-10 pointer-events-none">
          {/* Calm Negative Space Left/Top Title Lockup */}
          <div className="max-w-xl pointer-events-auto">
            <div className="parchment-surface rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-3">
                {/* Custom Inline SVG Wau Bulan Emblem */}
                <svg
                  viewBox="0 0 64 64"
                  className="w-12 h-12 shrink-0"
                  aria-hidden="true"
                >
                  <path
                    d="M32 6 C46 6 58 14 60 22 C49 25 40 24 32 21 C24 24 15 25 4 22 C6 14 18 6 32 6 Z"
                    fill="#065f46"
                    stroke="#d97706"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M32 24 C44 26 52 38 48 52 C40 46 35 45 32 47 C29 45 24 46 16 52 C12 38 20 26 32 24 Z"
                    fill="#047857"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                  />
                  <circle cx="32" cy="15" r="3.5" fill="#fbbf24" />
                </svg>
                <div>
                  <div className="text-xs font-semibold text-emerald-800">
                    Hikayat Nusantara · Misi 2 · Tahun 5
                  </div>
                  <h1 className="font-display text-3xl sm:text-4xl font-bold text-emerald-950 leading-tight">
                    Wau Sakti: Pencarian Kata Indah
                  </h1>
                </div>
              </div>

              <p className="text-sm sm:text-base text-stone-700 leading-relaxed mb-4">
                “Wahai pengembara muda! Kita telah berjaya memulihkan naskhah pusaka, namun keindahan bahasanya masih belum sempurna. Lima ungkapan indah telah dibawa jauh oleh bayu. Ayuh, kita terbang bersama Wau Sakti untuk mengumpulkannya semula!”
              </p>

              <div className="flex flex-wrap items-center gap-2.5">
                {hasSavedProgress ? (
                  <>
                    <button
                      type="button"
                      data-start="true"
                      onClick={handleResumeSaved}
                      className="px-5 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-amber-50 font-semibold text-sm flex items-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4" />
                      Sambung Pengembaraan
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetOpen(true)}
                      className="px-4 py-3 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-medium text-sm flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Mula Semula Latihan
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    data-start="true"
                    onClick={() => {
                      malayAudio.unlockFromUserGesture('garden');
                      setMusicPlaying(malayAudio.isPlaying());
                      setPhase('briefing');
                    }}
                    className="px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-amber-50 font-semibold text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Compass className="w-4 h-4" />
                    Mulakan Pengembaraan
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowAssessmentModal(true)}
                  className="px-4 py-3 rounded-xl bg-amber-100 border border-amber-300 hover:bg-amber-200 text-amber-950 font-medium text-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <BarChart3 className="w-4 h-4" />
                  Rekod Percubaan
                </button>
              </div>
            </div>
          </div>

          <div className="hud-panel rounded-lg px-4 py-2 text-xs text-amber-100 self-start pointer-events-none">
            Space / Klik Tetikus / Sentuh Skrin untuk Terbang · P atau Esc untuk Jeda
          </div>
        </div>
      )}

      {/* Confirmation dialog before wiping saved draft */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Sahkan Mula Semula"
            className="parchment-surface rounded-2xl max-w-md w-full p-6 text-stone-900"
          >
            <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-2">
              <ShieldAlert className="w-5 h-5" />
              Sahkan Mula Semula Latihan
            </div>
            <p className="text-sm text-stone-700 mb-5 leading-relaxed">
              Adakah kamu pasti mahu memulakan semula Misi 2? Draf hikayat dan rekod ungkapan yang disimpan sebelum ini akan dipadamkan.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 rounded-lg bg-white border border-stone-300 text-stone-800 text-sm font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-sm font-semibold cursor-pointer"
              >
                Ya, Mula Semula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE: BRIEFING NASKHAH & DIFFICULTY SELECTION */}
      {phase === 'briefing' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-stone-950/60 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Objektif Misi 2 dan Pilihan Mod"
            className="parchment-surface rounded-2xl max-w-3xl w-full p-6 sm:p-8 text-stone-900 my-auto max-h-[92vh] overflow-y-auto"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-emerald-800">
                Naskhah Objektif Misi 2 · Menuju Balai Olah Hikayat
              </span>
              <button
                type="button"
                onClick={() => setPhase('title')}
                className="text-xs text-stone-600 hover:underline cursor-pointer"
              >
                Kembali ke Taman Wau
              </button>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold text-emerald-950 mb-3">
              Peta Pengembaraan Langit Desa Hikayat
            </h2>

            <div className="rounded-xl bg-amber-50/90 border border-amber-300 p-4 mb-5 text-sm text-stone-800 space-y-2">
              <p>
                <strong>Langkah 1:</strong> Terbangkan <strong>Wau Bulan Sakti</strong> merentasi lima kawasan (Langit Sinar Senja hingga Puncak Cahaya Harapan) sambil mengelakkan halangan.
              </p>
              <p>
                <strong>Langkah 2:</strong> Selesaikan <strong>5 Gerbang Bahasa</strong> untuk mengumpulkan lima ungkapan indah ke dalam Bank Kata Warisan.
              </p>
              <p>
                <strong>Langkah 3:</strong> Tiba di <strong>Balai Olah Hikayat</strong> dan tulis sebuah cerita kreatif (Permulaan, Perkembangan, Pengakhiran) menggunakan sekurang-kurangnya dua ungkapan indah.
              </p>
            </div>

            <h3 className="font-display text-lg font-bold text-emerald-950 mb-2">
              Pilih Tahap Pengembaraan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {(['latihan', 'pengembara', 'pahlawan'] as DifficultyMode[]).map(
                (m) => {
                  const cfg = DIFFICULTY_CONFIGS[m];
                  const active = persisted.mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        setPersisted((prev) => ({ ...prev, mode: m }))
                      }
                      className={`text-left rounded-xl p-4 border-2 transition-colors cursor-pointer ${
                        active
                          ? 'bg-emerald-50 border-emerald-700'
                          : 'bg-white/85 border-stone-300 hover:border-amber-500'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-display font-bold text-base text-emerald-950">
                          {cfg.label}
                        </span>
                        {cfg.recommended && (
                          <span className="text-[11px] font-semibold text-amber-800">
                            Disyorkan
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-700 leading-snug">
                        {cfg.subtitle}
                      </p>
                    </button>
                  );
                },
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-amber-300/70">
              <button
                type="button"
                onClick={handleOpenAlternativeLanguagePath}
                className="px-4 py-2.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-emerald-800" />
                Laluan Checkpoint Bahasa Tanpa Halangan
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {persisted.tutorialCompleted && (
                  <button
                    type="button"
                    onClick={() => startFlightRun(persisted.mode, true)}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold cursor-pointer"
                  >
                    Terus Terbang
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startFlightRun(persisted.mode, false)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-amber-50 text-sm font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <Wind className="w-4 h-4" />
                  Mulakan Tutorial Penerbangan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE: FLIGHT HUD (Tutorial, Countdown, Playing, Paused, GameOver, Timeout) */}
      {isFlightStage && phase !== 'checkpoint' && phase !== 'flight_success' && (
        <FlightHUD
          phase={phase}
          mode={persisted.mode}
          timeRemaining={timeRemaining}
          countdownValue={countdownValue}
          hearts={hearts}
          collectedPhrases={persisted.collectedPhrases}
          completedCheckpointIndices={completedCheckpoints}
          hudSnapshot={hudSnapshot}
          hangTuahTip={hangTuahTip}
          tutorialFinished={tutorialFinished}
          onPauseToggle={() => {
            isLiftingRef.current = false;
            if (phase === 'paused') {
              malayAudio.play();
              setMusicPlaying(true);
              setPhase('playing');
            } else {
              setPhase('paused');
            }
          }}
          onRestartFlight={() => startFlightRun(persisted.mode, phase !== 'tutorial')}
          onSkipTutorial={() => startFlightRun(persisted.mode, true)}
          onStartFlightFromTutorial={() => startFlightRun(persisted.mode, true)}
          onRequestHint={() => {
            setHangTuahTip(
              'Petunjuk Hang Tuah: Tekan Space atau sentuh skrin dalam rentak pendek agar Wau Sakti meluncur tepat melalui celah bulatan cahaya emas.',
            );
          }}
          onReturnMenu={() => {
            isLiftingRef.current = false;
            setPhase('title');
          }}
          onSwitchToTraining={() => startFlightRun('latihan', true)}
          onOpenAlternativeLanguagePath={handleOpenAlternativeLanguagePath}
          onLiftStart={() => {
            malayAudio.playLiftSfx();
            isLiftingRef.current = true;
          }}
          onLiftEnd={() => {
            isLiftingRef.current = false;
          }}
        />
      )}

      {/* PHASE: CHECKPOINT LANGUAGE GATE MODAL */}
      {phase === 'checkpoint' && (
        <CheckpointModal
          key={activeCheckpointIdx}
          checkpoint={CHECKPOINTS[activeCheckpointIdx]}
          isAlternativePath={alternativePathActive}
          onAttemptOption={handleAttemptCheckpointOption}
          onContinueFlight={handleContinueAfterCheckpoint}
        />
      )}

      {/* PHASE: FLIGHT SUCCESS TRANSITION */}
      {phase === 'flight_success' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-stone-950/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Penerbangan Berjaya"
            className="parchment-surface rounded-2xl max-w-lg w-full p-6 sm:p-8 text-center text-stone-900"
          >
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Gerbang Balai Olah Hikayat Berjaya Direntasi
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-emerald-950 mb-3">
              PENERBANGAN BERJAYA — BENGKEL OLAH HIKAYAT DIBUKA
            </h2>
            <p className="text-sm text-stone-700 leading-relaxed mb-5">
              Wau Bulan Sakti mendarat dengan anggun di puncak bukit. Kelima-lima ungkapan indah kini bersedia untuk diolah menjadi hikayat kreatif!
            </p>
            <button
              type="button"
              onClick={() => setPhase('balai_arrival')}
              className="px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-amber-50 font-semibold text-sm cursor-pointer"
            >
              Masuk ke Balai Olah Hikayat
            </button>
          </div>
        </div>
      )}

      {/* PHASE: BALAI OLAH HIKAYAT & WRITING WORKSHOP & VICTORY */}
      {isWorkshopStage && (
        <WritingWorkshop
          phase={phase}
          collectedPhrases={persisted.collectedPhrases}
          draft={persisted.draft}
          checklist={persisted.checklist}
          storageAvailable={storageAvailable}
          xpAwarded={persisted.xpAwarded}
          missionCompleted={persisted.missionCompleted}
          onEnterWorkshopFromArrival={() => {
            setPersisted((p) => ({ ...p, savedPhase: 'workshop' }));
            setPhase('workshop');
          }}
          onUpdateDraft={(updater) =>
            setPersisted((prev) => ({
              ...prev,
              draft: updater(prev.draft),
            }))
          }
          onUpdateChecklist={(key: keyof SelfChecklistState, checked: boolean) =>
            setPersisted((prev) => ({
              ...prev,
              checklist: { ...prev.checklist, [key]: checked },
            }))
          }
          onManualSaveDraft={() => saveMission2State(persisted)}
          onMarkReviewed={() =>
            setPersisted((prev) => ({ ...prev, reviewChecked: true }))
          }
          onCompleteMission={() => {
            const ok = canCompleteMission({
              collectedPhrases: persisted.collectedPhrases,
              flightCompleted: persisted.flightCompleted,
              draft: persisted.draft,
              checklist: persisted.checklist,
            });
            if (!ok) return;
            malayAudio.playVictoryFanfare();
            setPersisted((prev) => {
              const rewarded = awardMissionXpOnce(prev);
              saveMission2State(rewarded);
              return rewarded;
            });
            setPhase('victory');
          }}
          onReplayFlight={() => startFlightRun(persisted.mode, true)}
          onOpenAssessment={() => setShowAssessmentModal(true)}
          onReturnToGarden={() => setPhase('title')}
        />
      )}

      {/* Real-Data Assessment & Progress Graph Modal */}
      {showAssessmentModal && (
        <AssessmentModal
          state={persisted}
          onClose={() => setShowAssessmentModal(false)}
        />
      )}
    </main>
  );
}
