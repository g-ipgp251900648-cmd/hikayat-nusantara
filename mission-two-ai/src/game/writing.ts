import { CHECKPOINTS } from './data';
import type {
  DraftCompletenessResult,
  PersistedMission2State,
  SelfChecklistState,
  StoryDraft,
} from './types';

export function normalizeMalayText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Counts how many of the 5 Bank Kata Indah phrases actually appear
 * inside the student's written text (Permulaan, Perkembangan, Pengakhiran).
 * Clicking or copying a phrase without putting it into the text returns 0 for that phrase.
 */
export function getUsedPhrasesInDraft(draft: StoryDraft): string[] {
  const combined = normalizeMalayText(
    `${draft.permulaan} ${draft.perkembangan} ${draft.pengakhiran}`,
  );
  if (!combined) return [];

  return CHECKPOINTS.map((cp) => cp.phrase).filter((phrase) =>
    combined.includes(normalizeMalayText(phrase)),
  );
}

export function countWordsInDraft(draft: StoryDraft): number {
  const combined = `${draft.permulaan} ${draft.perkembangan} ${draft.pengakhiran}`
    .replace(/_{2,}/g, ' ')
    .trim();
  if (!combined) return 0;
  return combined.split(/\s+/).filter(Boolean).length;
}

export function hasSubstantiveText(text: string): boolean {
  const cleaned = text.replace(/_{2,}/g, '').replace(/\s+/g, ' ').trim();
  // Must have at least 15 non-blank characters beyond template underscores
  return cleaned.length >= 15 && cleaned.split(' ').length >= 3;
}

export function insertPhraseAtCursor(
  currentText: string,
  selectionStart: number,
  selectionEnd: number,
  phrase: string,
): { nextText: string; nextCursorPos: number } {
  const safeStart = Math.max(0, Math.min(selectionStart, currentText.length));
  const safeEnd = Math.max(safeStart, Math.min(selectionEnd, currentText.length));

  const before = currentText.slice(0, safeStart);
  const after = currentText.slice(safeEnd);

  const needsSpaceBefore =
    before.length > 0 && !/[\s(\n"]$/.test(before);
  const needsSpaceAfter =
    after.length > 0 && !/^[\s.,!?;:)\n"]/.test(after);

  const inserted = `${needsSpaceBefore ? ' ' : ''}${phrase}${needsSpaceAfter ? ' ' : ''}`;
  const nextText = `${before}${inserted}${after}`;
  const nextCursorPos = before.length + inserted.length;

  return { nextText, nextCursorPos };
}

export function evaluateDraftCompleteness(
  draft: StoryDraft,
): DraftCompletenessResult {
  const hasWatak = Boolean(draft.watakId);
  const hasLatar = Boolean(draft.latarId);
  const hasPeristiwa = Boolean(draft.peristiwaId);
  const hasPermulaan = hasSubstantiveText(draft.permulaan);
  const hasPerkembangan = hasSubstantiveText(draft.perkembangan);
  const hasPengakhiran = hasSubstantiveText(draft.pengakhiran);

  const usedPhrases = getUsedPhrasesInDraft(draft);
  const requiredPhraseCount = 2;
  const hasMinPhrases = usedPhrases.length >= requiredPhraseCount;

  const feedbackMessages: string[] = [];
  if (!hasWatak || !hasLatar || !hasPeristiwa) {
    feedbackMessages.push(
      'Pastikan kamu telah memilih watak utama, latar tempat dan peristiwa penting sebelum menyemak karya.',
    );
  }
  if (!hasPermulaan) {
    feedbackMessages.push(
      'Cuba perkenalkan watak dan tempat berlakunya cerita pada bahagian Permulaan supaya pembaca dapat membayangkan suasana hikayat kamu.',
    );
  }
  if (!hasPerkembangan) {
    feedbackMessages.push(
      'Cerita kamu memerlukan bahagian Perkembangan yang lebih jelas. Tambahkan peristiwa atau cabaran yang dihadapi oleh watak utama.',
    );
  }
  if (!hasPengakhiran) {
    feedbackMessages.push(
      'Lengkapkan bahagian Pengakhiran dengan penyelesaian cerita serta pengajaran atau nilai murni yang diperoleh.',
    );
  }
  if (usedPhrases.length === 0) {
    feedbackMessages.push(
      'Kamu belum memasukkan sebarang ungkapan indah daripada Bank Kata. Gunakan sekurang-kurangnya dua ungkapan indah dalam hikayat kamu.',
    );
  } else if (usedPhrases.length === 1) {
    feedbackMessages.push(
      'Kamu telah menggunakan satu ungkapan indah. Tambahkan sekurang-kurangnya satu lagi ungkapan untuk menjadikan hikayat lebih menarik.',
    );
  }

  const isComplete =
    hasWatak &&
    hasLatar &&
    hasPeristiwa &&
    hasPermulaan &&
    hasPerkembangan &&
    hasPengakhiran &&
    hasMinPhrases;

  return {
    isComplete,
    wordCount: countWordsInDraft(draft),
    usedPhrases,
    requiredPhraseCount,
    checks: {
      hasWatak,
      hasLatar,
      hasPeristiwa,
      hasPermulaan,
      hasPerkembangan,
      hasPengakhiran,
      hasMinPhrases,
    },
    feedbackMessages,
  };
}

export function isChecklistComplete(checklist: SelfChecklistState): boolean {
  return Object.values(checklist).every(Boolean);
}

export function canCompleteMission(state: {
  collectedPhrases: string[];
  flightCompleted: boolean;
  draft: StoryDraft;
  checklist: SelfChecklistState;
}): boolean {
  const completeness = evaluateDraftCompleteness(state.draft);
  return (
    state.flightCompleted &&
    state.collectedPhrases.length >= CHECKPOINTS.length &&
    completeness.isComplete &&
    isChecklistComplete(state.checklist)
  );
}

export function awardMissionXpOnce(
  state: PersistedMission2State,
): PersistedMission2State {
  if (state.missionCompleted && state.xpAwarded >= 90) {
    return state;
  }
  return {
    ...state,
    missionCompleted: true,
    xpAwarded: 90,
    badgeUnlocked: true,
    savedPhase: 'victory',
  };
}
