import React, { useEffect, useRef } from 'react';
import {
  CHECKPOINTS,
  DIFFICULTY_CONFIGS,
  FINAL_GATE_WORLD_X,
  FLIGHT_ZONES,
  SKY_MAX_Y,
  SKY_MIN_Y,
} from '../game/data';
import {
  checkWauObstacleCollision,
  createInitialWauState,
  generateObstaclesForRun,
  generateTutorialObstacles,
  getZoneIndexForX,
  stepWauPhysics,
} from '../game/physics';
import type { DifficultyMode, GamePhase, ObstacleSpec } from '../game/types';
import type { FlightHudSnapshot } from './WorldViewport3D';

interface WorldViewport2DProps {
  phase: GamePhase;
  mode: DifficultyMode;
  runNonce: number;
  hearts: number;
  completedCheckpoints: number[];
  isLiftingRef: React.MutableRefObject<boolean>;
  onHudTick: (snapshot: FlightHudSnapshot) => void;
  onObstaclePassed: (points: number) => void;
  onCollisionHit: () => void;
  onCheckpointReached: (checkpointIndex: number) => void;
  onTutorialComplete: () => void;
  onFinalGateReached: () => void;
}

export const WorldViewport2D: React.FC<WorldViewport2DProps> = ({
  phase,
  mode,
  runNonce,
  hearts,
  completedCheckpoints,
  isLiftingRef,
  onHudTick,
  onObstaclePassed,
  onCollisionHit,
  onCheckpointReached,
  onTutorialComplete,
  onFinalGateReached,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef({
    phase,
    mode,
    hearts,
    completedCheckpoints,
    onHudTick,
    onObstaclePassed,
    onCollisionHit,
    onCheckpointReached,
    onTutorialComplete,
    onFinalGateReached,
  });
  propsRef.current = {
    phase,
    mode,
    hearts,
    completedCheckpoints,
    onHudTick,
    onObstaclePassed,
    onCollisionHit,
    onCheckpointReached,
    onTutorialComplete,
    onFinalGateReached,
  };

  const simRef = useRef<{
    wau: ReturnType<typeof createInitialWauState>;
    obstacles: ObstacleSpec[];
    triggered: Set<number>;
    finalTriggered: boolean;
    tutorialDone: boolean;
    score: number;
    lastHudAt: number;
  }>({
    wau: createInitialWauState(),
    obstacles: [],
    triggered: new Set(),
    finalTriggered: false,
    tutorialDone: false,
    score: 0,
    lastHudAt: 0,
  });

  useEffect(() => {
    if (phase === 'tutorial' || phase === 'countdown') {
      const cfg = DIFFICULTY_CONFIGS[mode];
      simRef.current = {
        wau: createInitialWauState(),
        obstacles:
          phase === 'tutorial'
            ? generateTutorialObstacles()
            : generateObstaclesForRun(cfg, 202605),
        triggered: new Set(completedCheckpoints),
        finalTriggered: false,
        tutorialDone: false,
        score: 0,
        lastHudAt: 0,
      };
    }
  }, [runNonce, mode, phase, completedCheckpoints]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;

    const resize = () => {
      canvas.width = canvas.clientWidth || window.innerWidth;
      canvas.height = canvas.clientHeight || window.innerHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const worldYToScreen = (wy: number, h: number) => {
      const padTop = 75;
      const padBot = 95;
      const norm = (wy - SKY_MIN_Y) / (SKY_MAX_Y - SKY_MIN_Y);
      return h - padBot - norm * (h - padTop - padBot);
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const p = propsRef.current;
      const sim = simRef.current;
      if (p.phase !== 'paused') elapsed += dt;

      const w = canvas.width;
      const h = canvas.height;
      const cfg = DIFFICULTY_CONFIGS[p.mode];

      if (p.phase === 'playing' || p.phase === 'tutorial') {
        let speedMult = 1;
        if (p.phase === 'playing') {
          for (const cp of CHECKPOINTS) {
            if (!sim.triggered.has(cp.index)) {
              const dist = cp.worldX - sim.wau.x;
              if (dist > 0 && dist < 8) speedMult = Math.max(0.45, dist / 8);
              if (dist <= 0.6) {
                sim.triggered.add(cp.index);
                p.onCheckpointReached(cp.index);
              }
              break;
            }
          }
          if (
            !sim.finalTriggered &&
            sim.triggered.size >= CHECKPOINTS.length &&
            sim.wau.x >= FINAL_GATE_WORLD_X - 0.5
          ) {
            sim.finalTriggered = true;
            p.onFinalGateReached();
          }
        } else if (!sim.tutorialDone && sim.wau.x >= 78) {
          sim.tutorialDone = true;
          p.onTutorialComplete();
        }

        sim.wau = stepWauPhysics(sim.wau, isLiftingRef.current, cfg, dt, speedMult);

        for (const obs of sim.obstacles) {
          if (!obs.passed && sim.wau.x > obs.worldX + 0.8) {
            obs.passed = true;
            if (p.phase === 'playing') {
              sim.score += 10;
              p.onObstaclePassed(10);
            }
          }
          if (
            p.phase === 'playing' &&
            sim.wau.invulnerableTimer <= 0 &&
            checkWauObstacleCollision(sim.wau.x, sim.wau.y, obs)
          ) {
            sim.wau.invulnerableTimer = 1.45;
            p.onCollisionHit();
          }
        }
      }

      const zoneIdx = getZoneIndexForX(sim.wau.x);
      const zone = FLIGHT_ZONES[zoneIdx];

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, zone.skyTop);
      skyGrad.addColorStop(0.78, zone.skyBottom);
      skyGrad.addColorStop(1, zone.groundTint);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Parallax distant hills
      ctx.fillStyle = 'rgba(28, 78, 52, 0.45)';
      ctx.beginPath();
      ctx.moveTo(0, h - 85);
      for (let sx = 0; sx <= w + 60; sx += 60) {
        const wave = Math.sin((sx + sim.wau.x * 8) * 0.012) * 32;
        ctx.lineTo(sx, h - 105 - wave);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Ground & river strip
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, h - 86, w, 16);
      ctx.fillStyle = zone.groundTint;
      ctx.fillRect(0, h - 70, w, 70);

      const scaleX = 36;
      const wauScreenX = w * 0.25;

      // Draw Obstacles
      sim.obstacles.forEach((obs) => {
        const sx = wauScreenX + (obs.worldX - sim.wau.x) * scaleX;
        if (sx < -80 || sx > w + 80) return;
        const gapTopY = worldYToScreen(obs.gapCenterY + obs.gapHalfHeight, h);
        const gapBotY = worldYToScreen(obs.gapCenterY - obs.gapHalfHeight, h);

        ctx.fillStyle = obs.kind === 'cloud' ? '#64748b' : obs.kind === 'lantern' ? '#ea580c' : '#14532d';
        if (obs.layout === 'gate_gap' || obs.layout === 'top_hang') {
          ctx.fillRect(sx - 20, 0, 40, gapTopY);
        }
        if (obs.layout === 'gate_gap' || obs.layout === 'bottom_rise') {
          ctx.fillRect(sx - 20, gapBotY, 40, h - 70 - gapBotY);
        }
      });

      // Draw Checkpoint Gates
      CHECKPOINTS.forEach((cp) => {
        const sx = wauScreenX + (cp.worldX - sim.wau.x) * scaleX;
        if (sx < -80 || sx > w + 80) return;
        ctx.fillStyle = '#78350f';
        ctx.fillRect(sx - 8, 90, 16, h - 160);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(sx, 90, 26, Math.PI, 0);
        ctx.fill();
      });

      // Draw Wau Bulan Sakti + Hang Tuah silhouette
      const wy = worldYToScreen(sim.wau.y, h);
      ctx.save();
      ctx.translate(wauScreenX, wy);
      ctx.rotate(-sim.wau.pitch);

      // Flowing ribbon tail
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-26, 4);
      ctx.quadraticCurveTo(-50, Math.sin(elapsed * 9) * 12, -74, Math.cos(elapsed * 7) * 8);
      ctx.stroke();

      // Wau wing
      ctx.fillStyle = '#065f46';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 32, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Hang Tuah rider bust
      ctx.fillStyle = '#047857';
      ctx.fillRect(-8, -22, 16, 18);
      ctx.fillStyle = '#dba37b';
      ctx.beginPath();
      ctx.arc(0, -28, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (now - sim.lastHudAt > 110) {
        sim.lastHudAt = now;
        p.onHudTick({
          worldX: sim.wau.x,
          zoneIndex: zoneIdx,
          progressPct: Math.min(100, Math.round((sim.wau.x / FINAL_GATE_WORLD_X) * 100)),
          hearts: p.hearts,
          score: sim.score,
          invulnerable: sim.wau.invulnerableTimer > 0,
        });
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [isLiftingRef]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="world-2d-canvas"
      className="absolute inset-0 w-full h-full select-none touch-none"
      onPointerDown={() => {
        if (propsRef.current.phase === 'playing' || propsRef.current.phase === 'tutorial') {
          isLiftingRef.current = true;
        }
      }}
      onPointerUp={() => {
        isLiftingRef.current = false;
      }}
      onPointerCancel={() => {
        isLiftingRef.current = false;
      }}
    />
  );
};
