import React from 'react';
import {
  Pause,
  Play,
  RotateCcw,
  HelpCircle,
  ArrowUp,
  Home,
  BookOpen,
  SkipForward,
} from 'lucide-react';
import { CHECKPOINTS, DIFFICULTY_CONFIGS, FLIGHT_ZONES } from '../game/data';
import type { DifficultyMode, GamePhase } from '../game/types';
import type { FlightHudSnapshot } from './WorldViewport3D';

interface FlightHUDProps {
  phase: GamePhase;
  mode: DifficultyMode;
  timeRemaining: number;
  countdownValue: number;
  hearts: number;
  collectedPhrases: string[];
  completedCheckpointIndices: number[];
  hudSnapshot: FlightHudSnapshot;
  hangTuahTip: string;
  onPauseToggle: () => void;
  onRestartFlight: () => void;
  onSkipTutorial: () => void;
  onStartFlightFromTutorial: () => void;
  onRequestHint: () => void;
  onReturnMenu: () => void;
  onSwitchToTraining: () => void;
  onOpenAlternativeLanguagePath: () => void;
  onLiftStart: () => void;
  onLiftEnd: () => void;
  tutorialFinished: boolean;
}

function formatTimer(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const FlightHUD: React.FC<FlightHUDProps> = ({
  phase,
  mode,
  timeRemaining,
  countdownValue,
  hearts,
  collectedPhrases,
  completedCheckpointIndices,
  hudSnapshot,
  hangTuahTip,
  onPauseToggle,
  onRestartFlight,
  onSkipTutorial,
  onStartFlightFromTutorial,
  onRequestHint,
  onReturnMenu,
  onSwitchToTraining,
  onOpenAlternativeLanguagePath,
  onLiftStart,
  onLiftEnd,
  tutorialFinished,
}) => {
  const cfg = DIFFICULTY_CONFIGS[mode];
  const zone = FLIGHT_ZONES[hudSnapshot.zoneIndex] || FLIGHT_ZONES[0];

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 sm:p-5">
      {/* Top HUD Bar */}
      <div className="flex flex-wrap items-start justify-between gap-2 pr-52 sm:pr-56">
        {/* Left Cluster: Timer, Hearts, Score */}
        <div className="hud-panel rounded-xl px-3.5 py-2.5 text-amber-50 flex flex-wrap items-center gap-4 pointer-events-auto">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-amber-300/85 font-semibold">
              {phase === 'tutorial' ? 'Latihan' : cfg.hasTimer ? 'Masa' : 'Mod Latihan'}
            </div>
            <div className="font-mono-num text-xl sm:text-2xl font-bold leading-tight text-white">
              {phase === 'tutorial'
                ? 'Bebas'
                : cfg.hasTimer
                  ? formatTimer(timeRemaining)
                  : 'Tanpa Had'}
            </div>
          </div>

          <div className="h-8 w-px bg-amber-400/25" />

          {/* 3 Hearts Vitality Sockets (Custom inline SVG) */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-amber-300/85 font-semibold">
              Nyawa
            </div>
            <div className="flex items-center gap-1 mt-0.5" aria-label={`Nyawa: ${hearts} daripada 3`}>
              {[0, 1, 2].map((idx) => {
                const full = idx < hearts;
                return (
                  <svg
                    key={idx}
                    viewBox="0 0 24 24"
                    className="w-6 h-6"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                      fill={full ? '#e11d48' : 'rgba(255,255,255,0.12)'}
                      stroke={full ? '#fda4af' : 'rgba(255,255,255,0.35)'}
                      strokeWidth="1.5"
                    />
                  </svg>
                );
              })}
            </div>
          </div>

          <div className="h-8 w-px bg-amber-400/25" />

          <div>
            <div className="text-[10px] uppercase tracking-wider text-amber-300/85 font-semibold">
              Skor Terbang
            </div>
            <div className="font-mono-num text-xl sm:text-2xl font-bold leading-tight text-amber-200">
              {Math.round(hudSnapshot.score)}
            </div>
          </div>

          <div className="h-8 w-px bg-amber-400/25" />

          <div>
            <div className="text-[10px] uppercase tracking-wider text-amber-300/85 font-semibold">
              Ungkapan
            </div>
            <div className="font-mono-num text-xl sm:text-2xl font-bold leading-tight text-emerald-300">
              {collectedPhrases.length}/5
            </div>
          </div>
        </div>

        {/* Center/Mini Journey Progress Map */}
        {phase !== 'tutorial' && (
          <div className="hud-panel rounded-xl px-3.5 py-2 text-amber-50 hidden lg:flex flex-col min-w-[300px]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-amber-200">{zone.name}</span>
              <span className="font-mono-num text-amber-100/80">
                {hudSnapshot.progressPct}% ke Balai
              </span>
            </div>
            <div className="flex items-center gap-2">
              {CHECKPOINTS.map((cp) => {
                const done = completedCheckpointIndices.includes(cp.index);
                return (
                  <div
                    key={cp.index}
                    title={cp.gateName}
                    className={`flex-1 h-2.5 rounded-sm border transition-colors ${
                      done
                        ? 'bg-emerald-500 border-emerald-200'
                        : 'bg-stone-800 border-amber-500/40'
                    }`}
                  />
                );
              })}
              <div
                title="Gerbang Balai Olah Hikayat"
                className={`w-4 h-4 rounded-sm border flex items-center justify-center text-[9px] font-bold ${
                  completedCheckpointIndices.length >= 5
                    ? 'bg-amber-400 text-stone-950 border-white'
                    : 'bg-stone-800 text-amber-300 border-amber-500/40'
                }`}
              >
                B
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Center Overlays for Countdown, Tutorial Completion, Pause, Game Over, Timeout */}
      <div className="flex-1 flex items-center justify-center relative">
        {phase === 'countdown' && (
          <div className="hud-panel rounded-2xl px-10 py-6 text-center pointer-events-none">
            <p className="text-xs uppercase tracking-widest text-amber-300 font-semibold mb-1">
              Bersedia di Langit Sinar Senja
            </p>
            <div className="font-display text-5xl sm:text-6xl font-bold text-amber-100 font-mono-num">
              {countdownValue > 0 ? countdownValue : 'TERBANG!'}
            </div>
          </div>
        )}

        {phase === 'tutorial' && tutorialFinished && (
          <div className="parchment-surface rounded-2xl p-6 max-w-md w-full text-center pointer-events-auto">
            <h2 className="font-display text-2xl font-bold text-emerald-950 mb-2">
              Latihan Penerbangan Berjaya!
            </h2>
            <p className="text-sm text-stone-700 mb-5 leading-relaxed">
              Hang Tuah berkata: “Bagus! Kamu sudah berjaya mengawal Wau Sakti. Sekarang, mari kita mencari lima ungkapan indah yang tersebar di langit Desa Hikayat!”
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onRestartFlight}
                className="px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-stone-800 text-sm font-medium hover:bg-stone-50 cursor-pointer"
              >
                Ulang Tutorial
              </button>
              <button
                type="button"
                onClick={onStartFlightFromTutorial}
                className="px-5 py-2.5 rounded-lg bg-emerald-800 text-amber-50 text-sm font-semibold hover:bg-emerald-900 cursor-pointer"
              >
                Mulakan Penerbangan Utama
              </button>
            </div>
          </div>
        )}

        {phase === 'paused' && (
          <div
            role="dialog"
            aria-label="Permainan Dijeda"
            className="parchment-surface rounded-2xl p-6 max-w-sm w-full text-center pointer-events-auto"
          >
            <h2 className="font-display text-2xl font-bold text-emerald-950 mb-2">
              Penerbangan Dijeda
            </h2>
            <p className="text-sm text-stone-700 mb-5">
              Pemasa dan pergerakan Wau Sakti diberhentikan sementara.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onPauseToggle}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-800 text-amber-50 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-900 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Sambung Penerbangan
              </button>
              <button
                type="button"
                onClick={onRestartFlight}
                className="w-full py-2.5 px-4 rounded-lg bg-white border border-stone-300 text-stone-800 font-medium text-sm flex items-center justify-center gap-2 hover:bg-stone-50 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Cuba Lagi
              </button>
              <button
                type="button"
                onClick={onReturnMenu}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 font-medium text-sm flex items-center justify-center gap-2 hover:bg-amber-200 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Kembali ke Menu Misi 2
              </button>
            </div>
          </div>
        )}

        {(phase === 'gameover' || phase === 'timeout') && (
          <div
            role="dialog"
            aria-label="Keputusan Penerbangan"
            className="parchment-surface rounded-2xl p-6 max-w-md w-full text-center pointer-events-auto"
          >
            <h2 className="font-display text-2xl font-bold text-emerald-950 mb-2">
              {phase === 'timeout'
                ? 'Masa Penerbangan Telah Tamat'
                : 'Wau Sakti Perlu Mendarat'}
            </h2>
            <p className="text-sm text-stone-700 mb-4 leading-relaxed">
              {phase === 'timeout'
                ? 'Jangan berputus asa! Masa 120 saat telah berakhir sebelum tiba di Gerbang Balai Olah Hikayat.'
                : 'Ketiga-tiga hati telah habis, namun Hang Tuah sedia membimbing kamu semula!'}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-5 text-left">
              <div className="bg-white/80 border border-stone-200 rounded-lg p-3">
                <div className="text-xs text-stone-600">Gerbang Selesai</div>
                <div className="font-mono-num text-xl font-bold text-emerald-900">
                  {completedCheckpointIndices.length}/5
                </div>
              </div>
              <div className="bg-white/80 border border-stone-200 rounded-lg p-3">
                <div className="text-xs text-stone-600">Ungkapan Terkumpul</div>
                <div className="font-mono-num text-xl font-bold text-amber-800">
                  {collectedPhrases.length}/5
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onRestartFlight}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-800 text-amber-50 font-semibold text-sm hover:bg-emerald-900 cursor-pointer"
              >
                Cuba Lagi
              </button>
              <button
                type="button"
                onClick={onSwitchToTraining}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 cursor-pointer"
              >
                Teruskan Melalui Mod Latihan (Tanpa Pemasa)
              </button>
              <button
                type="button"
                onClick={onOpenAlternativeLanguagePath}
                className="w-full py-2 px-4 rounded-lg bg-white border border-stone-300 text-stone-800 text-xs font-medium hover:bg-stone-50 cursor-pointer"
              >
                Laluan Checkpoint Bahasa Tanpa Halangan
              </button>
              <button
                type="button"
                onClick={onReturnMenu}
                className="w-full py-2 px-4 rounded-lg text-stone-600 text-xs font-medium hover:underline cursor-pointer"
              >
                Kembali ke Menu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls, Hang Tuah Coach & Touch Lift Area */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        {/* Hang Tuah Live Coaching Prompt */}
        <div className="hud-panel rounded-xl px-4 py-2.5 max-w-xl text-amber-50 pointer-events-auto">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-xs font-semibold text-amber-300">
              Pembimbing: Hang Tuah
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRequestHint}
                className="text-xs text-amber-200 hover:text-white flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Petunjuk
              </button>
              {phase === 'tutorial' ? (
                <button
                  type="button"
                  onClick={onSkipTutorial}
                  className="text-xs bg-amber-500/25 hover:bg-amber-500/40 text-amber-100 px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Langkau Tutorial
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onPauseToggle}
                  className="text-xs bg-amber-500/25 hover:bg-amber-500/40 text-amber-100 px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Jeda
                </button>
              )}
              <button
                type="button"
                onClick={onReturnMenu}
                className="text-xs text-stone-300 hover:text-white flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Menu
              </button>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-amber-50/95 leading-snug">
            {hangTuahTip}
          </p>
        </div>

        {/* Dedicated Touch & Mouse Lift Button */}
        {(phase === 'playing' || phase === 'tutorial') && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onLiftStart();
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              onLiftEnd();
            }}
            onPointerCancel={onLiftEnd}
            onPointerLeave={onLiftEnd}
            className="pointer-events-auto select-none touch-none px-5 py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-700 active:bg-amber-600 border-2 border-amber-300 text-amber-50 font-semibold text-sm flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <ArrowUp className="w-5 h-5" />
            <span>Tahan: Naikkan Wau (Space)</span>
          </button>
        )}
      </div>
    </div>
  );
};
