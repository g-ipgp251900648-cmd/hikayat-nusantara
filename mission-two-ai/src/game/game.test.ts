import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECKPOINTS,
  DIFFICULTY_CONFIGS,
  EXAMPLE_STORY_TEXT,
  INITIAL_CHECKLIST,
  INITIAL_DRAFT,
  SKY_MAX_Y,
  SKY_MIN_Y,
} from './data';
import {
  checkWauObstacleCollision,
  createInitialWauState,
  generateObstaclesForRun,
  generateTutorialObstacles,
  stepWauPhysics,
  verifyObstacleCoursePassable,
} from './physics';
import {
  awardMissionXpOnce,
  canCompleteMission,
  evaluateDraftCompleteness,
  getUsedPhrasesInDraft,
  insertPhraseAtCursor,
} from './writing';
import {
  appendAttemptRecord,
  computeCheckpointAccuracyStats,
  createDefaultMission2State,
} from './storage';

test('flight physics lifts when input held, descends under gravity when released, and clamps to sky bounds', () => {
  const cfg = DIFFICULTY_CONFIGS.pengembara;
  let state = createInitialWauState();
  const startY = state.y;

  // Hold lift for 0.4s
  for (let i = 0; i < 20; i++) {
    state = stepWauPhysics(state, true, cfg, 0.02);
  }
  assert.ok(state.y > startY, 'Wau must rise when lift is held');
  assert.ok(state.x > 0, 'Wau must advance forward automatically');

  // Release for 0.8s
  const peakY = state.y;
  for (let i = 0; i < 40; i++) {
    state = stepWauPhysics(state, false, cfg, 0.02);
  }
  assert.ok(state.y < peakY, 'Wau must descend under gravity when released');

  // Clamp upper bound
  for (let i = 0; i < 200; i++) {
    state = stepWauPhysics(state, true, cfg, 0.02);
  }
  assert.equal(state.y, SKY_MAX_Y);

  // Clamp lower bound
  for (let i = 0; i < 200; i++) {
    state = stepWauPhysics(state, false, cfg, 0.02);
  }
  assert.equal(state.y, SKY_MIN_Y);
});

test('generated obstacle courses are passable and have safe buffers around all 5 checkpoints', () => {
  for (const mode of ['latihan', 'pengembara', 'pahlawan'] as const) {
    const cfg = DIFFICULTY_CONFIGS[mode];
    const obstacles = generateObstaclesForRun(cfg, 202605);
    assert.ok(obstacles.length >= 10, `${mode} should have meaningful obstacles`);
    assert.equal(
      verifyObstacleCoursePassable(obstacles, cfg),
      true,
      `${mode} obstacle course must always be passable`,
    );
    for (const cp of CHECKPOINTS) {
      const tooClose = obstacles.some((o) => Math.abs(o.worldX - cp.worldX) < 12);
      assert.equal(tooClose, false, `Checkpoint ${cp.gateName} must have clear approach`);
    }
  }
});

test('tutorial obstacles have wide, fair openings and collision respects safe gap', () => {
  const tut = generateTutorialObstacles();
  assert.equal(tut.length, 3);
  const first = tut[0];
  assert.equal(
    checkWauObstacleCollision(first.worldX, first.gapCenterY, first),
    false,
    'Flying through gap center must not collide',
  );
  assert.equal(
    checkWauObstacleCollision(first.worldX, first.gapCenterY + first.gapHalfHeight + 1.2, first),
    true,
    'Flying above gap must collide with upper hazard',
  );
});

test('Bank Kata Indah counts only phrases present in written text and updates when deleted', () => {
  const draft = {
    ...INITIAL_DRAFT,
    watakId: 'melur',
    latarId: 'tepi_sungai',
    peristiwaId: 'membantu_kabus',
    permulaan: 'Pada suatu petang, sinar keemasan menyelimuti desa yang tenang.',
    perkembangan: 'Melur berjalan di tepi sungai bersama hati yang tulus.',
    pengakhiran: 'Akhirnya, mereka selamat pulang.',
  };

  assert.deepEqual(getUsedPhrasesInDraft(draft), [
    'sinar keemasan menyelimuti desa',
    'hati yang tulus',
  ]);

  // Removing a phrase from text immediately reduces the count
  const edited = {
    ...draft,
    perkembangan: 'Melur berjalan di tepi sungai dengan tenang.',
  };
  assert.deepEqual(getUsedPhrasesInDraft(edited), [
    'sinar keemasan menyelimuti desa',
  ]);
});

test('insertPhraseAtCursor inserts at exact cursor position inside active section', () => {
  const res = insertPhraseAtCursor(
    'Melur berjalan di kampung bersama rakan.',
    18,
    25,
    'desa yang permai',
  );
  assert.equal(res.nextText, 'Melur berjalan di desa yang permai bersama rakan.');
  assert.ok(res.nextCursorPos > 18);
});

test('completeness evaluator checks sections and phrases accurately', () => {
  const incomplete = evaluateDraftCompleteness({
    ...INITIAL_DRAFT,
    watakId: 'melur',
    latarId: 'desa_warisan',
    peristiwaId: 'pelita_pusaka',
    permulaan: 'Pada suatu petang, Melur melihat sinar keemasan menyelimuti desa.',
    perkembangan: '',
    pengakhiran: '',
  });
  assert.equal(incomplete.isComplete, false);
  assert.equal(incomplete.checks.hasPermulaan, true);
  assert.equal(incomplete.checks.hasPerkembangan, false);
  assert.equal(incomplete.checks.hasMinPhrases, false);

  const complete = evaluateDraftCompleteness({
    ...INITIAL_DRAFT,
    watakId: 'melur',
    latarId: 'desa_warisan',
    peristiwaId: 'pelita_pusaka',
    permulaan: 'Pada suatu petang, sinar keemasan menyelimuti desa yang aman damai.',
    perkembangan: 'Melur berjalan sambil menikmati hembusan bayu menyapa dedaunan lalu membantu warga tua dengan hati yang tulus.',
    pengakhiran: 'Akhirnya, sikapnya menjadi cahaya harapan dan teladan kepada seluruh penduduk kampung.',
  });
  assert.equal(complete.isComplete, true);
  assert.ok(complete.usedPhrases.length >= 4);

  // Example story uses all 5 phrases cleanly
  const exampleCount = getUsedPhrasesInDraft({
    ...INITIAL_DRAFT,
    permulaan: EXAMPLE_STORY_TEXT,
  });
  assert.equal(exampleCount.length, 5);
});

test('XP 90 is awarded only once and victory requires flight + completeness + checklist', () => {
  const base = createDefaultMission2State();
  const fullChecklist = {
    ...INITIAL_CHECKLIST,
    watakDanLatar: true,
    peristiwaJelas: true,
    permulaanLengkap: true,
    perkembanganLengkap: true,
    pengakhiranLengkap: true,
    duaUngkapanIndah: true,
    bacaSemulaSantun: true,
  };
  const validDraft = {
    ...INITIAL_DRAFT,
    watakId: 'melur',
    latarId: 'desa_warisan',
    peristiwaId: 'pelita_pusaka',
    permulaan: 'Pada suatu petang, sinar keemasan menyelimuti desa yang permai.',
    perkembangan: 'Melur membantu jiran dengan hati yang tulus ketika kabus melanda kampung.',
    pengakhiran: 'Akhirnya, penduduk kampung hidup bersatu padu dan saling menghormati.',
  };

  // Cannot complete before flight finishes
  assert.equal(
    canCompleteMission({
      collectedPhrases: CHECKPOINTS.map((c) => c.phrase),
      flightCompleted: false,
      draft: validDraft,
      checklist: fullChecklist,
    }),
    false,
  );

  // Can complete once flight, 5 phrases, valid draft, and checklist are all ready
  assert.equal(
    canCompleteMission({
      collectedPhrases: CHECKPOINTS.map((c) => c.phrase),
      flightCompleted: true,
      draft: validDraft,
      checklist: fullChecklist,
    }),
    true,
  );

  const firstAward = awardMissionXpOnce(base);
  assert.equal(firstAward.xpAwarded, 90);
  assert.equal(firstAward.missionCompleted, true);
  assert.equal(firstAward.badgeUnlocked, true);

  // Calling again does not double XP
  const secondAward = awardMissionXpOnce(firstAward);
  assert.equal(secondAward.xpAwarded, 90);
});

test('assessment accuracy distinguishes first-attempt vs corrected mastery and deduplicates attempts', () => {
  const records = CHECKPOINTS.map((cp, idx) => ({
    checkpointIndex: cp.index,
    firstAttemptCorrect: idx < 3,
    masteredAfterCorrection: true,
    attemptsUsed: idx < 3 ? 1 : 2,
  }));
  const stats = computeCheckpointAccuracyStats(records);
  assert.equal(stats.firstTryCount, 3);
  assert.equal(stats.masteredCount, 5);
  assert.equal(stats.firstTryPct, 60);

  const history = appendAttemptRecord([], {
    id: 'attempt_1',
    timestamp: 1000,
    mode: 'pengembara',
    completedFlight: true,
    checkpointsReached: 5,
    firstTryAccuracyPct: 60,
    masteredCount: 5,
    collisions: 1,
    heartsRemaining: 2,
    timeUsedSeconds: 74,
    alternativeLanguagePath: false,
  });
  const deduped = appendAttemptRecord(history, history[0]);
  assert.equal(deduped.length, 1);
});
