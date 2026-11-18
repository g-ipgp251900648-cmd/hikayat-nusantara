export type GamePhase =
  | 'title'
  | 'briefing'
  | 'tutorial'
  | 'countdown'
  | 'playing'
  | 'checkpoint'
  | 'paused'
  | 'gameover'
  | 'timeout'
  | 'flight_success'
  | 'balai_arrival'
  | 'workshop'
  | 'self_check'
  | 'preview'
  | 'victory';

export type DifficultyMode = 'latihan' | 'pengembara' | 'pahlawan';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type WritingSectionKey = 'permulaan' | 'perkembangan' | 'pengakhiran';

export interface DifficultyConfig {
  id: DifficultyMode;
  label: string;
  subtitle: string;
  recommended?: boolean;
  hasTimer: boolean;
  timerSeconds: number;
  maxHearts: number;
  forwardSpeed: number;
  gravity: number;
  liftAccel: number;
  maxVy: number;
  gapSize: number;
  obstacleInterval: number;
  hintsUnlimited: boolean;
  showGuidanceRing: boolean;
}

export interface FlightZone {
  id: number;
  name: string;
  subtitle: string;
  startX: number;
  endX: number;
  skyTop: string;
  skyBottom: string;
  fogColor: string;
  sunColor: string;
  groundTint: string;
  description: string;
}

export interface CheckpointOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
}

export interface CheckpointDefinition {
  index: number;
  gateName: string;
  zoneName: string;
  worldX: number;
  question: string;
  hint: string;
  phrase: string;
  phraseMeaning: string;
  phraseExample: string;
  hangTuahExplanation: string;
  options: CheckpointOption[];
}

export type ObstacleKind =
  | 'cloud'
  | 'leaves'
  | 'branch'
  | 'timber_arch'
  | 'wind_swirl'
  | 'lantern';

export interface ObstacleSpec {
  id: string;
  worldX: number;
  gapCenterY: number;
  gapHalfHeight: number;
  kind: ObstacleKind;
  zoneIndex: number;
  width: number;
  /** Some hazards occupy top+bottom leaving a gap; single hazards occupy one side */
  layout: 'gate_gap' | 'top_hang' | 'bottom_rise';
  passed: boolean;
}

export interface WatakOption {
  id: string;
  name: string;
  role: string;
  traits: string;
  accentColor: string;
  badgeText: string;
}

export interface LatarOption {
  id: string;
  name: string;
  description: string;
  atmosphere: string;
  palette: [string, string, string];
}

export interface PeristiwaOption {
  id: string;
  title: string;
  summary: string;
  guidingPrompt: string;
}

export interface StoryDraft {
  watakId: string;
  latarId: string;
  peristiwaId: string;
  useTemplate: boolean;
  permulaan: string;
  perkembangan: string;
  pengakhiran: string;
}

export interface SelfChecklistState {
  watakDanLatar: boolean;
  peristiwaJelas: boolean;
  permulaanLengkap: boolean;
  perkembanganLengkap: boolean;
  pengakhiranLengkap: boolean;
  duaUngkapanIndah: boolean;
  bacaSemulaSantun: boolean;
}

export interface DraftCompletenessResult {
  isComplete: boolean;
  wordCount: number;
  usedPhrases: string[];
  requiredPhraseCount: number;
  checks: {
    hasWatak: boolean;
    hasLatar: boolean;
    hasPeristiwa: boolean;
    hasPermulaan: boolean;
    hasPerkembangan: boolean;
    hasPengakhiran: boolean;
    hasMinPhrases: boolean;
  };
  feedbackMessages: string[];
}

export interface CheckpointMasteryRecord {
  checkpointIndex: number;
  firstAttemptCorrect: boolean | null;
  masteredAfterCorrection: boolean;
  attemptsUsed: number;
}

export interface FlightAttemptRecord {
  id: string;
  timestamp: number;
  mode: DifficultyMode;
  completedFlight: boolean;
  checkpointsReached: number;
  firstTryAccuracyPct: number;
  masteredCount: number;
  collisions: number;
  heartsRemaining: number;
  timeUsedSeconds: number;
  alternativeLanguagePath: boolean;
}

export interface PersistedMission2State {
  version: number;
  lastUpdated: number;
  savedPhase: GamePhase;
  mode: DifficultyMode;
  quality: GraphicsQuality;
  reducedMotion: boolean;
  use2DFallback: boolean;
  alternativeLanguagePath: boolean;
  tutorialCompleted: boolean;
  flightCompleted: boolean;
  collectedPhrases: string[];
  checkpointRecords: CheckpointMasteryRecord[];
  flightScore: number;
  lastRunStats: {
    timeRemaining: number;
    heartsRemaining: number;
    collisions: number;
    checkpointsCleared: number;
  };
  draft: StoryDraft;
  checklist: SelfChecklistState;
  reviewChecked: boolean;
  missionCompleted: boolean;
  xpAwarded: number;
  badgeUnlocked: boolean;
  attemptHistory: FlightAttemptRecord[];
}
