import { QUIZ_QUESTIONS, SEQUENCE_EVENTS, StoryPage } from './data';

export interface SequenceEvaluation {
  correctCount: number;
  total: number;
  isComplete: boolean;
  perCardCorrect: boolean[];
  feedback: string;
}

export interface QuizEvaluation {
  correctCount: number;
  total: number;
  isComplete: boolean;
  perQuestionCorrect: Record<string, boolean>;
}

export interface AssessmentAttempt {
  attemptNumber: number;
  sequenceScore: number; // out of 5
  quizScore: number; // out of 3
  totalScore: number; // out of 8
  percentage: number; // 0..100
  timestampIso: string;
  signature: string;
}

export interface MissionProgressSnapshot {
  foundScrollsCount: number;
  readStoryPagesCount: number;
  sequenceScore: number;
  quizScore: number;
}

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Shuffles sequence events using Fisher-Yates, ensuring the shuffled order
 * is never already completely solved (unless fewer than 2 items).
 */
export function shuffleEvents<T extends { id: string }>(
  items: readonly T[],
  rng: () => number = Math.random
): T[] {
  const copy = [...items];
  if (copy.length < 2) return copy;

  for (let attempt = 0; attempt < 10; attempt++) {
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    const alreadySame = copy.every((item, idx) => item.id === items[idx].id);
    if (!alreadySame) return copy;
  }
  // Deterministic fallback swap if rng kept returning identity
  const first = copy[0];
  copy[0] = copy[1];
  copy[1] = first;
  return copy;
}

/**
 * Evaluates the player's current ordering of the 5 sequence events.
 */
export function evaluateSequence(orderedIds: readonly string[]): SequenceEvaluation {
  const total = SEQUENCE_EVENTS.length;
  const perCardCorrect = orderedIds.map((id, idx) => {
    const ev = SEQUENCE_EVENTS.find((item) => item.id === id);
    return ev ? ev.correctIndex === idx : false;
  });
  const correctCount = perCardCorrect.filter(Boolean).length;
  const isComplete = correctCount === total && orderedIds.length === total;

  if (isComplete) {
    return {
      correctCount,
      total,
      isComplete: true,
      perCardCorrect,
      feedback:
        'Syabas! Kelima-lima peristiwa berada pada urutan yang tepat. Kitab Warisan kini memancarkan cahaya keemasan!',
    };
  }

  const numberWords = ['Tiada', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima'];
  const countWord = numberWords[correctCount] ?? String(correctCount);

  let hintSuffix = 'Cuba baca semula halaman kisah untuk memastikan jalan ceritanya tersusun rapi.';
  if (!perCardCorrect[0]) {
    hintSuffix = 'Mulakan dengan peristiwa bagaimana Melur mula-mula menemukan pelita di tepi sungai.';
  } else if (!perCardCorrect[1]) {
    hintSuffix = 'Teliti semula siapa yang menerangkan sejarah pelita sebelum kabus melanda desa.';
  } else if (!perCardCorrect[2]) {
    hintSuffix = 'Cuba teliti semula peristiwa yang berlaku tepat sebelum anak-anak menyalakan pelita.';
  } else if (!perCardCorrect[3] || !perCardCorrect[4]) {
    hintSuffix = 'Perhatikan perbezaan antara malam menyalakan pelita dengan kesepakatan penduduk selepas itu.';
  }

  return {
    correctCount,
    total,
    isComplete: false,
    perCardCorrect,
    feedback: `${countWord} daripada lima peristiwa berada pada kedudukan yang betul. ${hintSuffix}`,
  };
}

/**
 * Evaluates the 3-question comprehension quiz.
 */
export function evaluateQuiz(answers: Record<string, string | undefined>): QuizEvaluation {
  const perQuestionCorrect: Record<string, boolean> = {};
  let correctCount = 0;

  for (const q of QUIZ_QUESTIONS) {
    const isRight = answers[q.id] === q.correctOptionId;
    perQuestionCorrect[q.id] = isRight;
    if (isRight) correctCount += 1;
  }

  return {
    correctCount,
    total: QUIZ_QUESTIONS.length,
    isComplete: correctCount === QUIZ_QUESTIONS.length,
    perQuestionCorrect,
  };
}

/**
 * Builds a signature for an assessment check so identical consecutive submissions
 * are never recorded twice.
 */
export function buildAssessmentSignature(
  orderedIds: readonly string[],
  answers: Record<string, string | undefined>
): string {
  const seqPart = orderedIds.join(',');
  const quizPart = QUIZ_QUESTIONS.map((q) => `${q.id}:${answers[q.id] ?? ''}`).join('|');
  return `${seqPart}::${quizPart}`;
}

/**
 * Records a completed assessment attempt out of 8 marks (5 sequence + 3 quiz),
 * deduplicating identical consecutive submissions.
 */
export function recordAttempt(
  existing: readonly AssessmentAttempt[],
  sequenceScore: number,
  quizScore: number,
  signature: string,
  timestampIso: string = new Date().toISOString()
): AssessmentAttempt[] {
  const last = existing[existing.length - 1];
  if (last && last.signature === signature) {
    return [...existing];
  }

  const clampedSeq = Math.max(0, Math.min(5, Math.round(sequenceScore)));
  const clampedQuiz = Math.max(0, Math.min(3, Math.round(quizScore)));
  const totalScore = clampedSeq + clampedQuiz;
  const percentage = Math.round((totalScore / 8) * 100);

  const next: AssessmentAttempt = {
    attemptNumber: existing.length + 1,
    sequenceScore: clampedSeq,
    quizScore: clampedQuiz,
    totalScore,
    percentage,
    timestampIso,
    signature,
  };

  return [...existing, next];
}

/**
 * Mission can only be completed when ALL 4 requirements are fulfilled.
 */
export function canCompleteMission(
  progress: MissionProgressSnapshot,
  totalStoryPages: number = 5
): boolean {
  return (
    progress.foundScrollsCount >= 5 &&
    progress.readStoryPagesCount >= totalStoryPages &&
    progress.sequenceScore >= 5 &&
    progress.quizScore >= 3
  );
}

/**
 * Grants 60 XP and Lencana Penjaga Naskhah only once per mission completion.
 */
export function claimVictoryReward(state: {
  rewardClaimed: boolean;
  xp: number;
  badges: string[];
}): {
  rewardClaimed: boolean;
  xp: number;
  badges: string[];
  newlyGranted: boolean;
} {
  if (state.rewardClaimed) {
    return {
      rewardClaimed: true,
      xp: state.xp,
      badges: [...state.badges],
      newlyGranted: false,
    };
  }
  const badgeName = 'Lencana Penjaga Naskhah';
  const badges = state.badges.includes(badgeName)
    ? [...state.badges]
    : [...state.badges, badgeName];

  return {
    rewardClaimed: true,
    xp: state.xp + 60,
    badges,
    newlyGranted: true,
  };
}

/**
 * Resolves 2D circle vs AABB collision in the XZ plane so Hang Tuah slides smoothly
 * along walls and furniture without penetrating them.
 */
export function resolveCircleAABBCollision(
  x: number,
  z: number,
  radius: number,
  colliders: readonly AABB[],
  bounds: AABB
): { x: number; z: number } {
  let rx = Math.max(bounds.minX + radius, Math.min(bounds.maxX - radius, x));
  let rz = Math.max(bounds.minZ + radius, Math.min(bounds.maxZ - radius, z));

  for (let pass = 0; pass < 2; pass++) {
    for (const box of colliders) {
      const closestX = Math.max(box.minX, Math.min(rx, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(rz, box.maxZ));
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        if (distSq > 1e-8) {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          rx += (dx / dist) * overlap;
          rz += (dz / dist) * overlap;
        } else {
          // Center inside box: push out along shallowest axis
          const penLeft = Math.abs(rx - box.minX);
          const penRight = Math.abs(box.maxX - rx);
          const penTop = Math.abs(rz - box.minZ);
          const penBottom = Math.abs(box.maxZ - rz);
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);
          if (minPen === penLeft) rx = box.minX - radius;
          else if (minPen === penRight) rx = box.maxX + radius;
          else if (minPen === penTop) rz = box.minZ - radius;
          else rz = box.maxZ + radius;
        }
      }
    }
    rx = Math.max(bounds.minX + radius, Math.min(bounds.maxX - radius, rx));
    rz = Math.max(bounds.minZ + radius, Math.min(bounds.maxZ - radius, rz));
  }

  return { x: rx, z: rz };
}

/**
 * Formats seconds as MM:SS with tabular zero padding.
 */
export function formatTimerMMSS(secondsRemaining: number): string {
  const safe = Math.max(0, Math.floor(secondsRemaining));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Contextual Hang Tuah ("Pelita Pembimbing") hint selector based on current stage.
 */
export function getContextualHint(params: {
  foundScrolls: readonly string[];
  allScrollHints: readonly { id: string; hint: string }[];
  readStoryPagesCount: number;
  sequenceSolved: boolean;
  quizSolved: boolean;
  activeScreen: 'playing' | 'storybook' | 'sequencing' | 'quiz';
  sequenceFeedback?: string;
}): string {
  const {
    foundScrolls,
    allScrollHints,
    readStoryPagesCount,
    sequenceSolved,
    quizSolved,
    activeScreen,
    sequenceFeedback,
  } = params;

  if (activeScreen === 'storybook') {
    return readStoryPagesCount < 5
      ? `Teruskan membaca semua lima halaman kisah Cahaya Pelita di Desa Warisan (${readStoryPagesCount}/5 halaman dilalui).`
      : 'Bagus! Semua halaman sudah dibaca. Kamu boleh meneruskan ke cabaran menyusun peristiwa.';
  }

  if (activeScreen === 'sequencing') {
    if (sequenceSolved) {
      return 'Susunan peristiwa sudah tepat! Kini mari uji kefahamanmu dalam Detektif Pemahaman.';
    }
    return (
      sequenceFeedback ||
      'Ingat kembali urutan dari penemuan pelita di tepi sungai, nasihat Tok Penghulu, hingga malam kabus melanda kampung.'
    );
  }

  if (activeScreen === 'quiz') {
    if (quizSolved) {
      return 'Ketiga-tiga soalan berjaya dijawab! Semak semula jika semua cabaran telah selesai.';
    }
    return 'Baca soalan dengan teliti. Jika ragu-ragu, kamu boleh membuka semula buku cerita Cahaya Pelita di Desa Warisan.';
  }

  // Playing / 3D exploration
  const remaining = allScrollHints.filter((item) => !foundScrolls.includes(item.id));
  if (remaining.length > 0) {
    return remaining[0].hint;
  }

  if (readStoryPagesCount < 5) {
    return 'Semua lima helaian sudah ditemukan! Dekati Kitab Warisan di meja tengah untuk membaca kisah Pelita Warisan.';
  }

  if (!sequenceSolved) {
    return 'Kisah telah dibaca. Kini buka cabaran Susun Naskhah Berselerak untuk menyusun lima peristiwa!';
  }

  if (!quizSolved) {
    return 'Susunan peristiwa sudah tepat! Selesaikan kuiz Detektif Pemahaman untuk memulihkan Kitab Warisan.';
  }

  return 'Semua syarat sudah dipenuhi! Kitab Warisan bersedia dipulihkan.';
}

export function allPagesRead(readPages: readonly number[], pages: readonly StoryPage[]): boolean {
  return pages.every((p) => readPages.includes(p.pageNumber));
}
