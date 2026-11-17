import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAssessmentSignature,
  canCompleteMission,
  claimVictoryReward,
  evaluateQuiz,
  evaluateSequence,
  formatTimerMMSS,
  getContextualHint,
  recordAttempt,
  resolveCircleAABBCollision,
  shuffleEvents,
} from './rules';
import { SCROLL_STATIONS, SEQUENCE_EVENTS } from './data';

test('shuffleEvents returns all items in a non-solved order', () => {
  const shuffled = shuffleEvents(SEQUENCE_EVENTS, () => 0.42);
  assert.equal(shuffled.length, SEQUENCE_EVENTS.length);
  const sameOrder = shuffled.every((item, idx) => item.id === SEQUENCE_EVENTS[idx].id);
  assert.equal(sameOrder, false);
});

test('evaluateSequence scores partial and complete sequences accurately', () => {
  const partial = evaluateSequence(['ev-1', 'ev-3', 'ev-2', 'ev-4', 'ev-5']);
  assert.equal(partial.correctCount, 3);
  assert.equal(partial.isComplete, false);
  assert.match(partial.feedback, /Tiga daripada lima peristiwa/);

  const complete = evaluateSequence(['ev-1', 'ev-2', 'ev-3', 'ev-4', 'ev-5']);
  assert.equal(complete.correctCount, 5);
  assert.equal(complete.isComplete, true);
});

test('evaluateQuiz scores 3 questions accurately', () => {
  const partial = evaluateQuiz({ q1: 'sungai', q2: 'hiasan', q3: 'kerjasama' });
  assert.equal(partial.correctCount, 2);
  assert.equal(partial.isComplete, false);
  assert.equal(partial.perQuestionCorrect.q2, false);

  const perfect = evaluateQuiz({ q1: 'sungai', q2: 'kabus', q3: 'kerjasama' });
  assert.equal(perfect.correctCount, 3);
  assert.equal(perfect.isComplete, true);
});

test('recordAttempt computes /8 score, percentage, and deduplicates identical submissions', () => {
  const sig1 = buildAssessmentSignature(['ev-1', 'ev-3', 'ev-2', 'ev-4', 'ev-5'], {
    q1: 'sungai',
    q2: 'hiasan',
    q3: 'kerjasama',
  });
  const first = recordAttempt([], 3, 2, sig1, '2026-11-17T08:00:00Z');
  assert.equal(first.length, 1);
  assert.equal(first[0].totalScore, 5);
  assert.equal(first[0].percentage, 63);

  // Duplicate identical check should NOT add a second record
  const dup = recordAttempt(first, 3, 2, sig1, '2026-11-17T08:00:05Z');
  assert.equal(dup.length, 1);

  const sig2 = buildAssessmentSignature(['ev-1', 'ev-2', 'ev-3', 'ev-4', 'ev-5'], {
    q1: 'sungai',
    q2: 'kabus',
    q3: 'kerjasama',
  });
  const second = recordAttempt(dup, 5, 3, sig2, '2026-11-17T08:01:00Z');
  assert.equal(second.length, 2);
  assert.equal(second[1].attemptNumber, 2);
  assert.equal(second[1].totalScore, 8);
  assert.equal(second[1].percentage, 100);
});

test('canCompleteMission requires all 4 learning milestones', () => {
  assert.equal(
    canCompleteMission({
      foundScrollsCount: 4,
      readStoryPagesCount: 5,
      sequenceScore: 5,
      quizScore: 3,
    }),
    false
  );
  assert.equal(
    canCompleteMission({
      foundScrollsCount: 5,
      readStoryPagesCount: 4,
      sequenceScore: 5,
      quizScore: 3,
    }),
    false
  );
  assert.equal(
    canCompleteMission({
      foundScrollsCount: 5,
      readStoryPagesCount: 5,
      sequenceScore: 5,
      quizScore: 3,
    }),
    true
  );
});

test('claimVictoryReward grants 60 XP and badge only once', () => {
  const firstClaim = claimVictoryReward({ rewardClaimed: false, xp: 0, badges: [] });
  assert.equal(firstClaim.xp, 60);
  assert.equal(firstClaim.newlyGranted, true);
  assert.deepEqual(firstClaim.badges, ['Lencana Penjaga Naskhah']);

  const secondClaim = claimVictoryReward(firstClaim);
  assert.equal(secondClaim.xp, 60);
  assert.equal(secondClaim.newlyGranted, false);
});

test('resolveCircleAABBCollision prevents walking through furniture', () => {
  const tableBox = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };
  const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  const resolved = resolveCircleAABBCollision(0.7, 0.2, 0.5, [tableBox], bounds);
  assert.ok(resolved.x >= 1.49 || Math.abs(resolved.z) >= 1.49);
});

test('formatTimerMMSS and contextual hint behave as expected', () => {
  assert.equal(formatTimerMMSS(600), '10:00');
  assert.equal(formatTimerMMSS(65), '01:05');

  const hint = getContextualHint({
    foundScrolls: ['rak'],
    allScrollHints: SCROLL_STATIONS,
    readStoryPagesCount: 0,
    sequenceSolved: false,
    quizSolved: false,
    activeScreen: 'playing',
  });
  assert.equal(hint, SCROLL_STATIONS[1].hint);
});
