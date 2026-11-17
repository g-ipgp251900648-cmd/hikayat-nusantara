import React, { useRef, useState } from 'react';
import {
  BookOpen,
  Clock,
  Compass,
  Hand,
  HelpCircle,
  ListOrdered,
  Pause,
  Play,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { INTRO_DIALOGUE, SCROLL_STATIONS, ScrollId } from '../game/data';
import { formatTimerMMSS } from '../game/rules';
import { NearbyInteractable } from './WorldCanvas';

interface IntroOverlayProps {
  mode: 'cutscene' | 'briefing';
  onSkip: () => void;
  onStartSearch: () => void;
}

export const IntroOverlay: React.FC<IntroOverlayProps> = ({
  mode,
  onSkip,
  onStartSearch,
}) => {
  if (mode === 'cutscene') {
    return (
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6">
        <div className="flex justify-between items-start">
          <div className="wood-hud-panel px-4 py-2 rounded-xl">
            <p className="text-xs font-medium text-[#fde68a]">
              Desa Hikayat · Rumah Naskhah Pusaka
            </p>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="pointer-events-auto px-4 py-2 rounded-xl wood-hud-panel text-xs font-semibold text-[#faf3e0] hover:border-[#d4af37] cursor-pointer"
          >
            Langkau Pembukaan
          </button>
        </div>

        <div className="mx-auto max-w-xl wood-hud-panel px-5 py-3 rounded-xl text-center">
          <p className="text-sm text-[#faf3e0]">
            Hang Tuah melangkah masuk ke Rumah Naskhah Pusaka... sesuatu yang ajaib sedang berlaku pada Kitab Warisan!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#140d07]/55">
      <div className="parchment-panel rounded-2xl max-w-2xl w-full p-6 md:p-7">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#0d5c46] border-2 border-[#d4af37] flex items-center justify-center shrink-0 text-[#fde68a] font-display font-bold text-lg">
            HT
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#0d5c46]">
              Hang Tuah · Pelita Pembimbing
            </p>
            <blockquote className="mt-1.5 font-display text-lg md:text-xl text-[#2c1a0e] leading-snug">
              “{INTRO_DIALOGUE}”
            </blockquote>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[#b88b2e]/30">
          <h2 className="text-sm font-bold text-[#2c1a0e] mb-2.5">
            Objektif Misi 1 (Pemasa 10 Minit):
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm text-[#4a2e1b]">
            <li className="px-3 py-2 rounded-lg bg-[#f3e6c8]/80 border border-[#b88b2e]/35">
              <strong className="text-[#064e3b]">1. Cari 5 Helaian:</strong> Teroka lima lokasi di dalam Rumah Naskhah Pusaka.
            </li>
            <li className="px-3 py-2 rounded-lg bg-[#f3e6c8]/80 border border-[#b88b2e]/35">
              <strong className="text-[#064e3b]">2. Baca Kisah:</strong> Teliti lima halaman cerita Cahaya Pelita di Desa Warisan.
            </li>
            <li className="px-3 py-2 rounded-lg bg-[#f3e6c8]/80 border border-[#b88b2e]/35">
              <strong className="text-[#064e3b]">3. Susun Peristiwa:</strong> Susun lima kad peristiwa mengikut urutan tepat.
            </li>
            <li className="px-3 py-2 rounded-lg bg-[#f3e6c8]/80 border border-[#b88b2e]/35">
              <strong className="text-[#064e3b]">4. Kuiz Pemahaman:</strong> Jawab tiga soalan Detektif Pemahaman dengan betul.
            </li>
          </ol>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            data-start="true"
            onClick={onStartSearch}
            className="emerald-cta px-6 py-3 rounded-xl font-semibold text-base flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Mulakan Pencarian</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface HudOverlayProps {
  foundScrolls: ScrollId[];
  readStoryPagesCount: number;
  sequenceSolved: boolean;
  quizSolved: boolean;
  secondsRemaining: number;
  timerPaused: boolean;
  timerDisabled: boolean;
  timeExpiredPromptOpen: boolean;
  nearby: NearbyInteractable | null;
  hintMessage: string | null;
  toastMessage: string | null;
  musicPlaying: boolean;
  musicMuted: boolean;
  musicVolume: number;
  showTouchControls: boolean;
  mode2D: boolean;
  joystickVecRef: React.MutableRefObject<{ x: number; y: number }>;
  onInteractClick: () => void;
  onAutoGuideNext: () => void;
  onOpenStorybook: () => void;
  onOpenSequencing: () => void;
  onOpenQuiz: () => void;
  onRequestHint: () => void;
  onDismissHint: () => void;
  onToggleTimerPause: () => void;
  onAddExtraTime: (secs: number) => void;
  onDisableTimer: () => void;
  onToggleMusicPlay: () => void;
  onToggleMute: () => void;
  onChangeVolume: (v: number) => void;
  onOpenPauseModal: () => void;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  foundScrolls,
  readStoryPagesCount,
  sequenceSolved,
  quizSolved,
  secondsRemaining,
  timerPaused,
  timerDisabled,
  timeExpiredPromptOpen,
  nearby,
  hintMessage,
  toastMessage,
  musicPlaying,
  musicMuted,
  musicVolume,
  showTouchControls,
  mode2D,
  joystickVecRef,
  onInteractClick,
  onAutoGuideNext,
  onOpenStorybook,
  onOpenSequencing,
  onOpenQuiz,
  onRequestHint,
  onDismissHint,
  onToggleTimerPause,
  onAddExtraTime,
  onDisableTimer,
  onToggleMusicPlay,
  onToggleMute,
  onChangeVolume,
  onOpenPauseModal,
}) => {
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  const allScrollsFound = foundScrolls.length >= 5;
  const allPagesRead = readStoryPagesCount >= 5;
  const completedSteps =
    (allScrollsFound ? 1 : 0) +
    (allPagesRead ? 1 : 0) +
    (sequenceSolved ? 1 : 0) +
    (quizSolved ? 1 : 0);

  const handlePadPointer = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.36;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnobOffset({ x: dx, y: dy });
    joystickVecRef.current = { x: dx / maxR, y: dy / maxR };
  };

  const resetPad = () => {
    setKnobOffset({ x: 0, y: 0 });
    joystickVecRef.current = { x: 0, y: 0 };
  };

  const nextUnfound = SCROLL_STATIONS.find((s) => !foundScrolls.includes(s.id));

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 md:p-5">
      {/* TOP BAR CLUSTERS */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Timer & Mission Progress */}
        <div className="pointer-events-auto wood-hud-panel rounded-xl px-3.5 py-2.5 max-w-md">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#fde68a]" />
              <span
                data-testid="hud-timer"
                className="font-display font-bold text-base tabular-nums text-[#faf3e0]"
              >
                {timerDisabled ? 'Tanpa Had' : formatTimerMMSS(secondsRemaining)}
              </span>
              {!timerDisabled && (
                <button
                  type="button"
                  onClick={onToggleTimerPause}
                  aria-label={timerPaused ? 'Sambung pemasa' : 'Jeda pemasa'}
                  className="ml-1 px-2 py-0.5 rounded bg-[#4a2e1b] hover:bg-[#5b371e] text-[11px] font-medium text-[#fde68a] cursor-pointer"
                >
                  {timerPaused ? 'Sambung' : 'Jeda'}
                </button>
              )}
            </div>

            <span className="text-[#d4af37]/50" aria-hidden="true">·</span>

            <div className="text-xs font-semibold text-[#faf3e0] tabular-nums" data-testid="hud-scroll-count">
              Helaian Ditemukan: <span className="text-[#fde68a]">{foundScrolls.length}/5</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#1a1008] overflow-hidden">
            <div
              className="h-full bg-[#d4af37] transition-all duration-300"
              style={{
                width: `${Math.round(((foundScrolls.length / 5) * 0.4 + (completedSteps / 4) * 0.6) * 100)}%`,
              }}
            />
          </div>

          {/* Challenge Quick Access Strip (only active challenges enabled) */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className={allScrollsFound ? 'text-[#6ee7b7] font-semibold' : 'text-[#fde68a] font-semibold'}>
              1. Cari ({foundScrolls.length}/5)
            </span>
            <span aria-hidden="true">→</span>
            <button
              type="button"
              disabled={!allScrollsFound}
              onClick={onOpenStorybook}
              className={`px-2 py-0.5 rounded transition-colors ${
                allScrollsFound
                  ? 'bg-[#0d5c46] text-[#faf3e0] hover:bg-[#064e3b] cursor-pointer'
                  : 'text-[#ecdcb9]/50 cursor-not-allowed'
              }`}
            >
              2. Baca ({readStoryPagesCount}/5)
            </button>
            <span aria-hidden="true">→</span>
            <button
              type="button"
              disabled={!allPagesRead}
              onClick={onOpenSequencing}
              className={`px-2 py-0.5 rounded transition-colors ${
                allPagesRead
                  ? 'bg-[#0d5c46] text-[#faf3e0] hover:bg-[#064e3b] cursor-pointer'
                  : 'text-[#ecdcb9]/50 cursor-not-allowed'
              }`}
            >
              3. Susun {sequenceSolved ? '✓' : ''}
            </button>
            <span aria-hidden="true">→</span>
            <button
              type="button"
              disabled={!sequenceSolved}
              onClick={onOpenQuiz}
              className={`px-2 py-0.5 rounded transition-colors ${
                sequenceSolved
                  ? 'bg-[#0d5c46] text-[#faf3e0] hover:bg-[#064e3b] cursor-pointer'
                  : 'text-[#ecdcb9]/50 cursor-not-allowed'
              }`}
            >
              4. Kuiz {quizSolved ? '✓' : ''}
            </button>
          </div>
        </div>

        {/* Top-Right: Compact Audio, Hint & Pause Controls */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="wood-hud-panel rounded-xl px-2 py-1.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={onRequestHint}
              aria-label="Petunjuk Hang Tuah"
              className="px-2.5 py-1.5 rounded-lg bg-[#0d5c46] hover:bg-[#064e3b] text-[#faf3e0] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#fde68a]" />
              <span className="hidden sm:inline">Petunjuk</span>
            </button>

            <button
              type="button"
              onClick={onToggleMusicPlay}
              aria-label={musicPlaying ? 'Jeda muzik' : 'Main muzik'}
              className="p-1.5 rounded-lg hover:bg-[#4a2e1b] text-[#faf3e0] cursor-pointer"
              title={musicPlaying ? 'Jeda Muzik' : 'Main Muzik'}
            >
              {musicPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={musicMuted ? 'Nyahredam audio' : 'Redam audio'}
              className="p-1.5 rounded-lg hover:bg-[#4a2e1b] text-[#faf3e0] cursor-pointer"
              title={musicMuted ? 'Nyahredam' : 'Redam'}
            >
              {musicMuted ? <VolumeX className="w-4 h-4 text-amber-300" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setAudioMenuOpen((v) => !v)}
              aria-label="Kawalan kelantangan"
              className="px-2 py-1 rounded-lg hover:bg-[#4a2e1b] text-xs text-[#ecdcb9] tabular-nums cursor-pointer"
            >
              {Math.round(musicVolume * 100)}%
            </button>

            <button
              type="button"
              onClick={onOpenPauseModal}
              aria-label="Tetapan dan Jeda"
              className="p-1.5 rounded-lg hover:bg-[#4a2e1b] text-[#faf3e0] cursor-pointer"
              title="Tetapan / Jeda [P]"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {audioMenuOpen && (
            <div className="wood-hud-panel rounded-xl p-3 w-52">
              <label className="block text-xs font-medium text-[#fde68a] mb-1.5">
                Kelantangan Muzik ({Math.round(musicVolume * 100)}%)
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={musicVolume}
                onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                className="w-full accent-[#d4af37]"
              />
              <p className="mt-1.5 text-[11px] text-[#ecdcb9]/80">
                Muzik instrumental sintesis Web Audio (seruling, gambus, gamelan, rebana).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING PELITA PEMBIMBING HINT / DISCOVERY TOAST */}
      <div className="my-auto flex flex-col items-center gap-2 pointer-events-none">
        {hintMessage && (
          <div className="pointer-events-auto parchment-panel rounded-xl px-4 py-3 max-w-lg flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#0d5c46]">Pelita Pembimbing · Hang Tuah</p>
              <p className="text-sm text-[#2c1a0e] mt-0.5">{hintMessage}</p>
            </div>
            <button
              type="button"
              onClick={onDismissHint}
              aria-label="Tutup petunjuk"
              className="text-xs font-semibold text-[#5b371e] hover:text-[#2c1a0e] px-2 py-1 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {toastMessage && (
          <div className="wood-hud-panel rounded-xl px-4 py-2.5 max-w-md text-center">
            <p className="text-sm font-medium text-[#fde68a]">{toastMessage}</p>
          </div>
        )}
      </div>

      {/* TIME EXPIRED GENTLE MODAL */}
      {timeExpiredPromptOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#140d07]/60 pointer-events-auto">
          <div className="parchment-panel rounded-2xl max-w-md w-full p-6">
            <h3 className="font-display text-xl font-bold text-[#2c1a0e]">
              Masa 10 Minit Sudah Tamat!
            </h3>
            <p className="mt-2 text-sm text-[#4a2e1b]">
              Jangan risau, semua kemajuan kamu kekal selamat. Pilih cara untuk meneruskan pengembaraan ini:
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => onAddExtraTime(300)}
                className="emerald-cta px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Tambah +5 Minit
              </button>
              <button
                type="button"
                onClick={onDisableTimer}
                className="gold-cta px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Teruskan Tanpa Pemasa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM DOCK: INTERACT BUTTON, AUTO-GUIDE & TOUCH JOYSTICK */}
      <div className="flex items-end justify-between gap-4">
        {/* Virtual Joystick (touch devices or when toggled) */}
        {showTouchControls && !mode2D ? (
          <div
            ref={padRef}
            aria-label="Kawalan arah maya"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handlePadPointer(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (e.buttons > 0) handlePadPointer(e.clientX, e.clientY);
            }}
            onPointerUp={resetPad}
            onPointerCancel={resetPad}
            className="pointer-events-auto w-28 h-28 rounded-full wood-hud-panel relative flex items-center justify-center touch-none select-none"
          >
            <div
              className="w-11 h-11 rounded-full bg-[#d4af37] border-2 border-[#fef3c7] shadow-md"
              style={{
                transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
              }}
            />
          </div>
        ) : (
          <div className="w-1" />
        )}

        {/* Center Contextual Action + Auto-Guide */}
        <div className="pointer-events-auto mx-auto flex flex-wrap items-center justify-center gap-2.5">
          {nearby && (
            <button
              type="button"
              data-testid="interact-btn"
              onClick={onInteractClick}
              className="gold-cta px-5 py-3 rounded-xl font-bold text-sm md:text-base flex items-center gap-2 cursor-pointer"
            >
              <Hand className="w-4 h-4" />
              <span>[E] {nearby.label}</span>
            </button>
          )}

          {!mode2D && !allScrollsFound && nextUnfound && (
            <button
              type="button"
              onClick={onAutoGuideNext}
              className="wood-hud-panel px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold text-[#faf3e0] hover:border-[#d4af37] flex items-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#fde68a]" />
              <span>Pandu ke {nextUnfound.locationName}</span>
            </button>
          )}

          {allScrollsFound && !allPagesRead && (
            <button
              type="button"
              onClick={onOpenStorybook}
              className="emerald-cta px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Buka Kitab Warisan</span>
            </button>
          )}

          {allPagesRead && !sequenceSolved && (
            <button
              type="button"
              onClick={onOpenSequencing}
              className="emerald-cta px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <ListOrdered className="w-4 h-4" />
              <span>Buka Susun Naskhah</span>
            </button>
          )}

          {sequenceSolved && !quizSolved && (
            <button
              type="button"
              onClick={onOpenQuiz}
              className="emerald-cta px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Buka Kuiz Pemahaman</span>
            </button>
          )}
        </div>

        <div className="w-1" />
      </div>
    </div>
  );
};
