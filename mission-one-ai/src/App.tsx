import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  QUIZ_QUESTIONS,
  KITAB_STATION,
  SCROLL_STATIONS,
  SEQUENCE_EVENTS,
  STORY_PAGES,
  ScrollId,
  SequenceEvent,
} from './game/data';
import { audioEngine } from './game/audio';
import {
  AssessmentAttempt,
  QuizEvaluation,
  SequenceEvaluation,
  buildAssessmentSignature,
  canCompleteMission,
  claimVictoryReward,
  evaluateQuiz,
  evaluateSequence,
  getContextualHint,
  recordAttempt,
  shuffleEvents,
} from './game/rules';
import {
  AutoWalkRequest,
  NearbyInteractable,
  ScenePhase,
  WorldCanvas,
} from './components/WorldCanvas';
import { Fallback2DExplorer } from './components/Fallback2DExplorer';
import { TitleScreen } from './components/TitleScreen';
import { HudOverlay, IntroOverlay } from './components/HudOverlay';
import { PauseSettingsModal } from './components/PauseSettingsModal';
import { StorybookModal } from './components/StorybookModal';
import { SequencingModal } from './components/SequencingModal';
import { QuizModal } from './components/QuizModal';
import { VictoryModal } from './components/VictoryModal';

type AppScreen =
  | 'title'
  | 'intro'
  | 'intro_briefing'
  | 'playing'
  | 'storybook'
  | 'sequencing'
  | 'quiz'
  | 'paused'
  | 'victory';

const STORAGE_KEY = 'hikayat_nusantara_misi1_progress_v1';

interface StoredProfile {
  xp: number;
  badges: string[];
  attempts: AssessmentAttempt[];
}

function loadProfile(): StoredProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { xp: 0, badges: [], attempts: [] };
    const parsed = JSON.parse(raw) as Partial<StoredProfile>;
    return {
      xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
    };
  } catch {
    return { xp: 0, badges: [], attempts: [] };
  }
}

export default function App() {
  const autostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const initialProfile = useMemo(() => loadProfile(), []);

  const [screen, setScreen] = useState<AppScreen>(autostart ? 'playing' : 'title');
  const [returnScreenAfterPause, setReturnScreenAfterPause] = useState<AppScreen>('playing');

  // Graphics & Accessibility settings
  const [lowGraphics, setLowGraphics] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  const [mode2D, setMode2D] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(() =>
    typeof window !== 'undefined' ? 'ontouchstart' in window || navigator.maxTouchPoints > 0 : false
  );

  // Persistent Rewards & Attempt Logs
  const [xp, setXp] = useState(initialProfile.xp);
  const [badges, setBadges] = useState<string[]>(initialProfile.badges);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>(initialProfile.attempts);
  const [rewardClaimedThisRun, setRewardClaimedThisRun] = useState(false);
  const [newlyGrantedXp, setNewlyGrantedXp] = useState(false);

  // Mission Run Progress
  const [foundScrolls, setFoundScrolls] = useState<ScrollId[]>([]);
  const [readStoryPages, setReadStoryPages] = useState<number[]>([]);
  const [sequenceCards, setSequenceCards] = useState<SequenceEvent[]>(() =>
    shuffleEvents(SEQUENCE_EVENTS)
  );
  const [sequenceEval, setSequenceEval] = useState<SequenceEvaluation | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string | undefined>>({});
  const [quizEval, setQuizEval] = useState<QuizEvaluation | null>(null);

  // 10-minute Timer (600 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState(600);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerDisabled, setTimerDisabled] = useState(false);
  const [timeExpiredPromptOpen, setTimeExpiredPromptOpen] = useState(false);

  // Audio UI state mirror
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.65);
  const [isIndoor, setIsIndoor] = useState(false);

  // 3D Interaction & Hints
  const [nearby, setNearby] = useState<NearbyInteractable | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [introSkipNonce, setIntroSkipNonce] = useState(0);
  const [restartNonce, setRestartNonce] = useState(0);
  const [interactNonce, setInteractNonce] = useState(0);
  const [autoWalkRequest, setAutoWalkRequest] = useState<AutoWalkRequest | null>(null);

  const joystickVecRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const toastTimeoutRef = useRef<number | null>(null);

  // Save persistent profile to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ xp, badges, attempts })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [xp, badges, attempts]);

  // Sync body dataset state for testability and clear focus transitions
  useEffect(() => {
    if (screen === 'title') document.body.dataset.state = 'title';
    else if (screen === 'paused') document.body.dataset.state = 'paused';
    else if (screen === 'victory') document.body.dataset.state = 'gameover';
    else document.body.dataset.state = 'playing';
  }, [screen]);

  // Sync music mood & ducking
  useEffect(() => {
    if (screen === 'victory') {
      audioEngine.setDucked(false);
      audioEngine.setMood('victory');
    } else if (screen === 'storybook' || screen === 'sequencing' || screen === 'quiz') {
      audioEngine.setDucked(true);
    } else if (screen === 'playing') {
      audioEngine.setDucked(false);
      if (!isIndoor) {
        audioEngine.setMood('outdoor');
      } else if (foundScrolls.length < 5) {
        audioEngine.setMood('search');
      } else {
        audioEngine.setMood('indoor');
      }
    } else if (screen === 'intro' || screen === 'intro_briefing') {
      audioEngine.setDucked(false);
      audioEngine.setMood(isIndoor ? 'indoor' : 'outdoor');
    }
  }, [screen, isIndoor, foundScrolls.length]);

  // 10-minute timer tick
  useEffect(() => {
    if (
      timerDisabled ||
      timerPaused ||
      timeExpiredPromptOpen ||
      screen === 'title' ||
      screen === 'intro' ||
      screen === 'intro_briefing' ||
      screen === 'paused' ||
      screen === 'victory'
    ) {
      return;
    }

    const id = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setTimeExpiredPromptOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [timerDisabled, timerPaused, timeExpiredPromptOpen, screen]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3600);
  }, []);

  const resetRunProgress = useCallback(() => {
    setFoundScrolls([]);
    setReadStoryPages([]);
    setSequenceCards(shuffleEvents(SEQUENCE_EVENTS));
    setSequenceEval(null);
    setQuizAnswers({});
    setQuizEval(null);
    setSecondsRemaining(600);
    setTimerPaused(false);
    setTimerDisabled(false);
    setTimeExpiredPromptOpen(false);
    setRewardClaimedThisRun(false);
    setNewlyGrantedXp(false);
    setHintMessage(null);
    setToastMessage(null);
    setNearby(null);
    setAutoWalkRequest(null);
  }, []);

  const handleStartFromTitle = useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    audioEngine.startMusic();
    setMusicPlaying(true);
    resetRunProgress();
    if (mode2D || reduceMotion) {
      setScreen('intro_briefing');
    } else {
      setScreen('intro');
    }
  }, [mode2D, reduceMotion, resetRunProgress]);

  const handleSkipIntro = useCallback(() => {
    setIntroSkipNonce((n) => n + 1);
    setScreen('intro_briefing');
  }, []);

  const handleStartSearch = useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    audioEngine.playSoftClick();
    setScreen('playing');
    showToast('Teroka lima lokasi di Rumah Naskhah Pusaka untuk mencari helaian yang hilang!');
  }, [showToast]);

  // Global keyboard shortcuts (Enter/Space on Title, Esc/P for Pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screen === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleStartFromTitle();
        return;
      }
      if (e.code === 'Escape' || (e.code === 'KeyP' && screen === 'playing')) {
        if (screen === 'playing') {
          setReturnScreenAfterPause('playing');
          setScreen('paused');
        } else if (screen === 'paused') {
          setScreen(returnScreenAfterPause);
        } else if (screen === 'storybook' || screen === 'sequencing' || screen === 'quiz') {
          setScreen('playing');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, returnScreenAfterPause, handleStartFromTitle]);

  const handleInspectTarget = useCallback(
    (target: NearbyInteractable) => {
      if (target.kind === 'scroll') {
        const id = target.id as ScrollId;
        if (foundScrolls.includes(id)) return;
        if (id === 'peti') audioEngine.playChestOpenSfx();
        audioEngine.playScrollFoundChime();

        const nextFound = [...foundScrolls, id];
        setFoundScrolls(nextFound);
        const st = SCROLL_STATIONS.find((s) => s.id === id);
        if (nextFound.length >= 5) {
          showToast(
            'Kelima-lima helaian berjaya ditemukan! Kitab Warisan kini bercahaya untuk dibaca.'
          );
        } else if (st) {
          showToast(st.foundMessage);
        }
      } else {
        // Kitab Warisan
        if (foundScrolls.length < 5) {
          showToast(
            `Masih terdapat ${5 - foundScrolls.length} helaian lagi di dalam rumah sebelum Kitab Warisan boleh dibaca.`
          );
          return;
        }
        audioEngine.playSoftClick();
        if (readStoryPages.length < STORY_PAGES.length) {
          setScreen('storybook');
        } else if (!sequenceEval?.isComplete) {
          setScreen('sequencing');
        } else {
          setScreen('quiz');
        }
      }
    },
    [foundScrolls, readStoryPages.length, sequenceEval?.isComplete, showToast]
  );

  const handleMarkPageRead = useCallback((pageNumber: number) => {
    setReadStoryPages((prev) => (prev.includes(pageNumber) ? prev : [...prev, pageNumber]));
  }, []);

  const handleCheckSequence = useCallback(() => {
    audioEngine.playSoftClick();
    const res = evaluateSequence(sequenceCards.map((c) => c.id));
    setSequenceEval(res);
    if (res.isComplete) {
      audioEngine.playScrollFoundChime();
    }
  }, [sequenceCards]);

  // Progress events are only delivered to a same-origin parent portal. The
  // standalone Google AI Studio preview continues to work without any parent.
  const notifyHikayatPortal = useCallback((eventType: 'attempt' | 'victory', payload: {
    foundScrolls: ScrollId[];
    readStoryPages: number[];
    orderedIds: string[];
    quizAnswers: Record<string, string | undefined>;
    signature: string;
  }) => {
    if (window.parent === window) return;
    window.parent.postMessage({
      source: 'hikayat-misi1-aistudio-original',
      version: 1,
      eventType,
      payload,
    }, window.location.origin);
  }, []);

  const handleSubmitQuizCheck = useCallback(() => {
    audioEngine.playSoftClick();
    const qRes = evaluateQuiz(quizAnswers);
    setQuizEval(qRes);

    const orderedIds = sequenceCards.map((c) => c.id);
    const seqScore = sequenceEval ? sequenceEval.correctCount : 0;
    const sig = buildAssessmentSignature(orderedIds, quizAnswers);
    const isDuplicate = attempts.at(-1)?.signature === sig;
    setAttempts((prev) =>
      recordAttempt(prev, seqScore, qRes.correctCount, sig)
    );
    // Send only a complete, new assessment check. The parent validates all
    // evidence before updating XP and attempt statistics.
    if (!isDuplicate && QUIZ_QUESTIONS.every((q) => Boolean(quizAnswers[q.id]))) {
      notifyHikayatPortal('attempt', {
        foundScrolls: [...foundScrolls],
        readStoryPages: [...readStoryPages],
        orderedIds,
        quizAnswers: { ...quizAnswers },
        signature: sig,
      });
    }

    if (qRes.isComplete) {
      audioEngine.playScrollFoundChime();
    }
  }, [quizAnswers, sequenceCards, sequenceEval, attempts, foundScrolls, readStoryPages, notifyHikayatPortal]);

  const allMissionsReady = canCompleteMission(
    {
      foundScrollsCount: foundScrolls.length,
      readStoryPagesCount: readStoryPages.length,
      sequenceScore: sequenceEval?.correctCount ?? 0,
      quizScore: quizEval?.correctCount ?? 0,
    },
    STORY_PAGES.length
  );

  const handleCompleteMission = useCallback(() => {
    if (!allMissionsReady) return;
    const reward = claimVictoryReward({
      rewardClaimed: rewardClaimedThisRun,
      xp,
      badges,
    });
    setRewardClaimedThisRun(reward.rewardClaimed);
    setXp(reward.xp);
    setBadges(reward.badges);
    setNewlyGrantedXp(reward.newlyGranted);

    notifyHikayatPortal('victory', {
      foundScrolls: [...foundScrolls],
      readStoryPages: [...readStoryPages],
      orderedIds: sequenceCards.map((c) => c.id),
      quizAnswers: { ...quizAnswers },
      signature: buildAssessmentSignature(sequenceCards.map((c) => c.id), quizAnswers),
    });
    audioEngine.playVictoryFanfare();
    setScreen('victory');
  }, [allMissionsReady, rewardClaimedThisRun, xp, badges, foundScrolls, readStoryPages, sequenceCards, quizAnswers, notifyHikayatPortal]);

  const handleAutoGuideNext = useCallback(() => {
    const nextStation = SCROLL_STATIONS.find((s) => !foundScrolls.includes(s.id));
    if (nextStation) {
      setAutoWalkRequest({
        id: nextStation.id,
        targetX: nextStation.approachPos.x,
        targetZ: nextStation.approachPos.z,
        autoInspect: true,
        nonce: Date.now(),
      });
      showToast(`Hang Tuah menuju ke ${nextStation.locationName}...`);
    } else {
      setAutoWalkRequest({
        id: 'kitab',
        targetX: KITAB_STATION.approachPos.x,
        targetZ: KITAB_STATION.approachPos.z,
        autoInspect: true,
        nonce: Date.now(),
      });
    }
  }, [foundScrolls, showToast]);

  const handleRequestHint = useCallback(() => {
    audioEngine.playSoftClick();
    const msg = getContextualHint({
      foundScrolls,
      allScrollHints: SCROLL_STATIONS,
      readStoryPagesCount: readStoryPages.length,
      sequenceSolved: Boolean(sequenceEval?.isComplete),
      quizSolved: Boolean(quizEval?.isComplete),
      activeScreen: 'playing',
      sequenceFeedback: sequenceEval?.feedback,
    });
    setHintMessage(msg);
  }, [foundScrolls, readStoryPages.length, sequenceEval, quizEval]);

  const handlePlayAgain = useCallback(() => {
    audioEngine.playSoftClick();
    resetRunProgress();
    setRestartNonce((n) => n + 1);
    setScreen(mode2D || reduceMotion ? 'intro_briefing' : 'intro');
  }, [mode2D, reduceMotion, resetRunProgress]);

  const handleBackToMenu = useCallback(() => {
    audioEngine.pauseMusic();
    setMusicPlaying(false);
    resetRunProgress();
    setRestartNonce((n) => n + 1);
    setScreen('title');
  }, [resetRunProgress]);

  const scenePhase: ScenePhase = useMemo(() => {
    if (screen === 'title') return 'title';
    if (screen === 'intro') return 'intro';
    if (screen === 'intro_briefing') return 'intro_briefing';
    if (screen === 'paused') return 'paused';
    if (screen === 'victory') return 'victory';
    if (screen === 'storybook' || screen === 'sequencing' || screen === 'quiz') return 'modal';
    return 'playing';
  }, [screen]);

  return (
    <main
      className={`w-full h-full relative overflow-hidden ${
        reduceMotion ? 'reduce-motion' : ''
      }`}
    >
      {/* Primary 3D World OR Accessible 2D Fallback Explorer */}
      {!mode2D ? (
        <WorldCanvas
          phase={scenePhase}
          foundScrolls={foundScrolls}
          lowGraphics={lowGraphics}
          reduceMotion={reduceMotion}
          introSkipNonce={introSkipNonce}
          restartNonce={restartNonce}
          joystickVecRef={joystickVecRef}
          autoWalkRequest={autoWalkRequest}
          interactNonce={interactNonce}
          onNearbyChange={setNearby}
          onInspectTarget={handleInspectTarget}
          onIntroFinished={() => setScreen('intro_briefing')}
          onIndoorStateChange={setIsIndoor}
          onWebglError={() => setMode2D(true)}
        />
      ) : (
        <Fallback2DExplorer
          foundScrolls={foundScrolls}
          onInspectTarget={handleInspectTarget}
        />
      )}

      {/* Title Screen */}
      {screen === 'title' && (
        <TitleScreen
          onStart={handleStartFromTitle}
          lowGraphics={lowGraphics}
          onToggleLowGraphics={() => setLowGraphics((v) => !v)}
          reduceMotion={reduceMotion}
          onToggleReduceMotion={() => setReduceMotion((v) => !v)}
          mode2D={mode2D}
          onToggleMode2D={() => setMode2D((v) => !v)}
          savedXp={xp}
          hasBadge={badges.includes('Lencana Penjaga Naskhah')}
        />
      )}

      {/* Intro Cutscene & Mission Briefing */}
      {screen === 'intro' && (
        <IntroOverlay
          mode="cutscene"
          onSkip={handleSkipIntro}
          onStartSearch={handleStartSearch}
        />
      )}
      {screen === 'intro_briefing' && (
        <IntroOverlay
          mode="briefing"
          onSkip={handleSkipIntro}
          onStartSearch={handleStartSearch}
        />
      )}

      {/* Exploration HUD */}
      {screen === 'playing' && (
        <HudOverlay
          foundScrolls={foundScrolls}
          readStoryPagesCount={readStoryPages.length}
          sequenceSolved={Boolean(sequenceEval?.isComplete)}
          quizSolved={Boolean(quizEval?.isComplete)}
          secondsRemaining={secondsRemaining}
          timerPaused={timerPaused}
          timerDisabled={timerDisabled}
          timeExpiredPromptOpen={timeExpiredPromptOpen}
          nearby={nearby}
          hintMessage={hintMessage}
          toastMessage={toastMessage}
          musicPlaying={musicPlaying}
          musicMuted={musicMuted}
          musicVolume={musicVolume}
          showTouchControls={showTouchControls}
          mode2D={mode2D}
          joystickVecRef={joystickVecRef}
          onInteractClick={() => {
            if (mode2D && nearby) {
              handleInspectTarget(nearby);
            } else {
              setInteractNonce((n) => n + 1);
            }
          }}
          onAutoGuideNext={handleAutoGuideNext}
          onOpenStorybook={() => setScreen('storybook')}
          onOpenSequencing={() => setScreen('sequencing')}
          onOpenQuiz={() => setScreen('quiz')}
          onRequestHint={handleRequestHint}
          onDismissHint={() => setHintMessage(null)}
          onToggleTimerPause={() => setTimerPaused((v) => !v)}
          onAddExtraTime={(secs) => {
            setSecondsRemaining((prev) => prev + secs);
            setTimeExpiredPromptOpen(false);
          }}
          onDisableTimer={() => {
            setTimerDisabled(true);
            setTimeExpiredPromptOpen(false);
          }}
          onToggleMusicPlay={() => {
            const playing = audioEngine.togglePlay();
            setMusicPlaying(playing);
          }}
          onToggleMute={() => {
            const next = !musicMuted;
            audioEngine.setMuted(next);
            setMusicMuted(next);
          }}
          onChangeVolume={(v) => {
            audioEngine.setVolume(v);
            setMusicVolume(v);
          }}
          onOpenPauseModal={() => {
            setReturnScreenAfterPause('playing');
            setScreen('paused');
          }}
        />
      )}

      {/* Cabaran 2: Buku Cerita Digital */}
      {screen === 'storybook' && (
        <StorybookModal
          readPages={readStoryPages}
          onMarkPageRead={handleMarkPageRead}
          onProceedToSequencing={() => setScreen('sequencing')}
          onClose={() => setScreen('playing')}
        />
      )}

      {/* Cabaran 3: Susun Naskhah Berselerak */}
      {screen === 'sequencing' && (
        <SequencingModal
          cards={sequenceCards}
          evaluation={sequenceEval}
          onChangeOrder={(next) => {
            setSequenceCards(next);
            setSequenceEval(null);
          }}
          onCheckSequence={handleCheckSequence}
          onOpenStorybook={() => setScreen('storybook')}
          onProceedToQuiz={() => setScreen('quiz')}
          onClose={() => setScreen('playing')}
        />
      )}

      {/* Cabaran 4: Kuiz Detektif Pemahaman */}
      {screen === 'quiz' && (
        <QuizModal
          answers={quizAnswers}
          evaluation={quizEval}
          sequenceScore={sequenceEval?.correctCount ?? 0}
          attempts={attempts}
          allMissionsReady={allMissionsReady}
          onSelectOption={(qId, optId) => {
            setQuizAnswers((prev) => ({ ...prev, [qId]: optId }));
            setQuizEval(null);
          }}
          onSubmitQuizCheck={handleSubmitQuizCheck}
          onOpenStorybook={() => setScreen('storybook')}
          onCompleteMission={handleCompleteMission}
          onClose={() => setScreen('playing')}
        />
      )}

      {/* Pause & Settings Modal */}
      {screen === 'paused' && (
        <PauseSettingsModal
          onResume={() => setScreen(returnScreenAfterPause)}
          onRestart={handlePlayAgain}
          onBackToTitle={handleBackToMenu}
          lowGraphics={lowGraphics}
          onToggleLowGraphics={() => setLowGraphics((v) => !v)}
          reduceMotion={reduceMotion}
          onToggleReduceMotion={() => setReduceMotion((v) => !v)}
          showTouchControls={showTouchControls}
          onToggleTouchControls={() => setShowTouchControls((v) => !v)}
          mode2D={mode2D}
          onToggleMode2D={() => setMode2D((v) => !v)}
        />
      )}

      {/* Cinematic Victory Celebration */}
      {screen === 'victory' && (
        <VictoryModal
          xpTotal={xp}
          newlyGrantedXp={newlyGrantedXp}
          attempts={attempts}
          onPlayAgain={handlePlayAgain}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </main>
  );
}
