import {
  CHECKPOINTS,
  FINAL_GATE_WORLD_X,
  FLIGHT_ZONES,
  SKY_MAX_Y,
  SKY_MIN_Y,
  WAU_START_Y,
} from './data';
import type { DifficultyConfig, ObstacleKind, ObstacleSpec } from './types';

export interface WauPhysicsState {
  x: number;
  y: number;
  vy: number;
  pitch: number;
  invulnerableTimer: number;
}

export function createInitialWauState(): WauPhysicsState {
  return {
    x: 0,
    y: WAU_START_Y,
    vy: 0,
    pitch: 0,
    invulnerableTimer: 0,
  };
}

export function stepWauPhysics(
  state: WauPhysicsState,
  isLifting: boolean,
  config: DifficultyConfig,
  rawDt: number,
  forwardMultiplier = 1,
): WauPhysicsState {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  const netAccel = isLifting
    ? config.liftAccel - config.gravity
    : -config.gravity;

  let nextVy = state.vy + netAccel * dt;
  // Gentle vertical damping when switching direction so movement feels responsive, not floaty
  if (isLifting && nextVy < 0) {
    nextVy += config.liftAccel * 0.45 * dt;
  } else if (!isLifting && nextVy > 0) {
    nextVy -= config.gravity * 0.85 * dt;
  }
  nextVy = Math.max(-config.maxVy, Math.min(config.maxVy, nextVy));

  let nextY = state.y + nextVy * dt;
  if (nextY <= SKY_MIN_Y) {
    nextY = SKY_MIN_Y;
    if (nextVy < 0) nextVy = 0;
  } else if (nextY >= SKY_MAX_Y) {
    nextY = SKY_MAX_Y;
    if (nextVy > 0) nextVy = 0;
  }

  const nextX = state.x + config.forwardSpeed * forwardMultiplier * dt;
  const targetPitch = Math.max(-0.34, Math.min(0.36, nextVy * 0.055));
  const pitch = state.pitch + (targetPitch - state.pitch) * Math.min(1, dt * 10);
  const invulnerableTimer = Math.max(0, state.invulnerableTimer - dt);

  return {
    x: nextX,
    y: nextY,
    vy: nextVy,
    pitch,
    invulnerableTimer,
  };
}

export function getZoneIndexForX(worldX: number): number {
  for (let i = FLIGHT_ZONES.length - 1; i >= 0; i--) {
    if (worldX >= FLIGHT_ZONES[i].startX) {
      return i;
    }
  }
  return 0;
}

const ZONE_OBSTACLE_KINDS: ObstacleKind[][] = [
  ['cloud', 'leaves'],
  ['timber_arch', 'lantern', 'leaves'],
  ['wind_swirl', 'branch', 'cloud'],
  ['lantern', 'leaves', 'wind_swirl'],
  ['timber_arch', 'lantern', 'wind_swirl', 'cloud'],
];

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateTutorialObstacles(): ObstacleSpec[] {
  return [
    {
      id: 'tut_1',
      worldX: 24,
      gapCenterY: 6.4,
      gapHalfHeight: 2.6,
      kind: 'cloud',
      zoneIndex: 0,
      width: 1.4,
      layout: 'gate_gap',
      passed: false,
    },
    {
      id: 'tut_2',
      worldX: 46,
      gapCenterY: 7.4,
      gapHalfHeight: 2.5,
      kind: 'leaves',
      zoneIndex: 0,
      width: 1.4,
      layout: 'gate_gap',
      passed: false,
    },
    {
      id: 'tut_3',
      worldX: 68,
      gapCenterY: 5.4,
      gapHalfHeight: 2.5,
      kind: 'lantern',
      zoneIndex: 0,
      width: 1.4,
      layout: 'gate_gap',
      passed: false,
    },
  ];
}

export function generateObstaclesForRun(
  config: DifficultyConfig,
  seed = 202605,
): ObstacleSpec[] {
  const rand = seededRandom(seed);
  const obstacles: ObstacleSpec[] = [];
  const gapHalf = config.gapSize / 2;
  const safeMinCenter = SKY_MIN_Y + gapHalf + 0.5;
  const safeMaxCenter = SKY_MAX_Y - gapHalf - 0.5;

  let prevGapY = WAU_START_Y;
  let x = 22;
  let counter = 0;

  while (x < FINAL_GATE_WORLD_X - 18) {
    // Ensure safe, unobstructed approach and exit around every checkpoint gate
    const nearCheckpoint = CHECKPOINTS.some(
      (cp) => Math.abs(x - cp.worldX) < 13.5,
    );
    if (!nearCheckpoint) {
      const zoneIndex = getZoneIndexForX(x);
      const zoneKinds = ZONE_OBSTACLE_KINDS[zoneIndex] || ZONE_OBSTACLE_KINDS[0];
      const kind = zoneKinds[counter % zoneKinds.length];

      // Reachability guarantee: limit vertical shift based on available travel time
      const progressRatio = x / FINAL_GATE_WORLD_X;
      const maxShift = 1.6 + progressRatio * 1.1;
      const delta = (rand() * 2 - 1) * maxShift;
      const gapCenterY = Math.max(
        safeMinCenter,
        Math.min(safeMaxCenter, prevGapY + delta),
      );
      prevGapY = gapCenterY;

      // Slight gentle narrowing in later zones while always staying well above wau height
      const difficultyShrink =
        config.id === 'pahlawan' ? progressRatio * 0.25 : progressRatio * 0.12;
      const effectiveGapHalf = Math.max(1.45, gapHalf - difficultyShrink);

      const layoutOptions: ObstacleSpec['layout'][] =
        zoneIndex === 0
          ? ['gate_gap', 'bottom_rise', 'top_hang']
          : ['gate_gap', 'gate_gap', 'top_hang', 'bottom_rise'];
      const layout = layoutOptions[counter % layoutOptions.length];

      obstacles.push({
        id: `obs_${counter}`,
        worldX: Number(x.toFixed(2)),
        gapCenterY: Number(gapCenterY.toFixed(2)),
        gapHalfHeight: Number(effectiveGapHalf.toFixed(2)),
        kind,
        zoneIndex,
        width: kind === 'timber_arch' ? 1.5 : 1.35,
        layout,
        passed: false,
      });
      counter += 1;
    }

    const jitter = (rand() - 0.5) * 2.2;
    x += Math.max(12.5, config.obstacleInterval + jitter);
  }

  return obstacles;
}

export function checkWauObstacleCollision(
  wauX: number,
  wauY: number,
  obstacle: ObstacleSpec,
): boolean {
  // Generous hitbox slightly smaller than visual wau silhouette
  const wauHalfW = 0.56;
  const wauHalfH = 0.42;

  const dx = Math.abs(wauX - obstacle.worldX);
  if (dx > obstacle.width * 0.5 + wauHalfW) {
    return false;
  }

  const gapTop = obstacle.gapCenterY + obstacle.gapHalfHeight;
  const gapBottom = obstacle.gapCenterY - obstacle.gapHalfHeight;

  if (obstacle.layout === 'gate_gap') {
    return wauY + wauHalfH > gapTop || wauY - wauHalfH < gapBottom;
  }
  if (obstacle.layout === 'top_hang') {
    return wauY + wauHalfH > gapTop;
  }
  // bottom_rise
  return wauY - wauHalfH < gapBottom;
}

export function verifyObstacleCoursePassable(
  obstacles: ObstacleSpec[],
  config: DifficultyConfig,
): boolean {
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    if (obs.gapHalfHeight < 1.2) return false;
    if (obs.gapCenterY - obs.gapHalfHeight < SKY_MIN_Y - 0.4) return false;
    if (obs.gapCenterY + obs.gapHalfHeight > SKY_MAX_Y + 0.4) return false;
    const nearCp = CHECKPOINTS.some((cp) => Math.abs(obs.worldX - cp.worldX) < 10);
    if (nearCp) return false;
    if (i > 0) {
      const prev = obstacles[i - 1];
      const dx = obs.worldX - prev.worldX;
      if (dx < 11) return false;
      const dtAvailable = dx / config.forwardSpeed;
      const maxVerticalReach = config.maxVy * dtAvailable * 0.85;
      if (Math.abs(obs.gapCenterY - prev.gapCenterY) > maxVerticalReach + obs.gapHalfHeight) {
        return false;
      }
    }
  }
  return true;
}
