import React from 'react';
import { Monitor, Play, RotateCcw } from 'lucide-react';

interface PauseSettingsModalProps {
  onResume: () => void;
  onRestart: () => void;
  onBackToTitle: () => void;
  lowGraphics: boolean;
  onToggleLowGraphics: () => void;
  reduceMotion: boolean;
  onToggleReduceMotion: () => void;
  showTouchControls: boolean;
  onToggleTouchControls: () => void;
  mode2D: boolean;
  onToggleMode2D: () => void;
}

export const PauseSettingsModal: React.FC<PauseSettingsModalProps> = ({
  onResume,
  onRestart,
  onBackToTitle,
  lowGraphics,
  onToggleLowGraphics,
  reduceMotion,
  onToggleReduceMotion,
  showTouchControls,
  onToggleTouchControls,
  mode2D,
  onToggleMode2D,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#140d07]/65">
      <div className="parchment-panel rounded-2xl max-w-md w-full p-6">
        <h2 className="font-display text-2xl font-bold text-[#2c1a0e]">
          Permainan Dijeda
        </h2>
        <p className="text-sm text-[#5b371e] mt-1">
          Laraskan paparan atau sambung pengembaraan di Rumah Naskhah Pusaka.
        </p>

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={onToggleLowGraphics}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#f3e6c8] border border-[#b88b2e]/40 text-sm font-medium text-[#2c1a0e] cursor-pointer"
          >
            <span>Mod Grafik Rendah</span>
            <span className="font-bold text-[#0d5c46]">{lowGraphics ? 'Aktif' : 'Biasa'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleReduceMotion}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#f3e6c8] border border-[#b88b2e]/40 text-sm font-medium text-[#2c1a0e] cursor-pointer"
          >
            <span>Kurangkan Animasi</span>
            <span className="font-bold text-[#0d5c46]">{reduceMotion ? 'Ya' : 'Tidak'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTouchControls}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#f3e6c8] border border-[#b88b2e]/40 text-sm font-medium text-[#2c1a0e] cursor-pointer"
          >
            <span>Joystick Sentuh Maya</span>
            <span className="font-bold text-[#0d5c46]">{showTouchControls ? 'Papar' : 'Sembunyi'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMode2D}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#f3e6c8] border border-[#b88b2e]/40 text-sm font-medium text-[#2c1a0e] cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-[#0d5c46]" />
              <span>Paparan Alternatif 2D</span>
            </span>
            <span className="font-bold text-[#0d5c46]">{mode2D ? '2D Aktif' : '3D WebGL'}</span>
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="emerald-cta w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Sambung Permainan</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="py-2.5 px-3 rounded-xl border border-[#b88b2e] text-sm font-semibold text-[#2c1a0e] hover:bg-[#ecdcb9] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Main Semula</span>
            </button>
            <button
              type="button"
              onClick={onBackToTitle}
              className="py-2.5 px-3 rounded-xl border border-[#b88b2e] text-sm font-semibold text-[#2c1a0e] hover:bg-[#ecdcb9] cursor-pointer"
            >
              Menu Utama
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
