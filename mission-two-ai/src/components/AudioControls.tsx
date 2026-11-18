import React, { useState } from 'react';
import { Volume2, VolumeX, Play, Pause, SlidersHorizontal, X } from 'lucide-react';
import type { GraphicsQuality } from '../game/types';

interface AudioControlsProps {
  musicPlaying: boolean;
  muted: boolean;
  volume: number;
  quality: GraphicsQuality;
  reducedMotion: boolean;
  use2DFallback: boolean;
  onTogglePlayMusic: () => void;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
  onQualityChange: (q: GraphicsQuality) => void;
  onToggleReducedMotion: () => void;
  onToggle2DFallback: () => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  musicPlaying,
  muted,
  volume,
  quality,
  reducedMotion,
  use2DFallback,
  onTogglePlayMusic,
  onToggleMute,
  onVolumeChange,
  onQualityChange,
  onToggleReducedMotion,
  onToggle2DFallback,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative pointer-events-auto">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onTogglePlayMusic}
          aria-label={musicPlaying ? 'Jeda Muzik' : 'Mainkan Muzik'}
          title={musicPlaying ? 'Jeda Muzik' : 'Mainkan Muzik'}
          className="hud-panel h-10 w-10 rounded-lg flex items-center justify-center text-amber-200 hover:text-white hover:border-amber-400 transition-colors cursor-pointer"
        >
          {musicPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Nyahredam Audio' : 'Redam Audio'}
          title={muted ? 'Nyahredam Audio' : 'Redam Audio'}
          className="hud-panel h-10 w-10 rounded-lg flex items-center justify-center text-amber-200 hover:text-white hover:border-amber-400 transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label="Tetapan Audio dan Grafik"
          title="Tetapan Audio & Grafik"
          className="hud-panel h-10 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium text-amber-100 hover:text-white hover:border-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Tetapan</span>
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Tetapan Audio dan Grafik"
          className="absolute right-0 mt-2 w-80 parchment-surface rounded-xl p-4 text-stone-800 z-50"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-base text-emerald-950">
              Tetapan Audio &amp; Paparan
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup Tetapan"
              className="p-1.5 rounded-md text-stone-600 hover:bg-amber-900/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-stone-700 mb-1">
                <label htmlFor="audio-volume-slider">Kelantangan Muzik</label>
                <span className="font-mono-num">{Math.round(volume * 100)}%</span>
              </div>
              <input
                id="audio-volume-slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="w-full accent-emerald-700 cursor-pointer"
              />
              <p className="text-[11px] text-stone-600 mt-1 leading-snug">
                Nota audio: Muzik seruling, gambus, gamelan dan rebana dijana menggunakan sintesis Web Audio API, bukan rakaman instrumen studio.
              </p>
            </div>

            <div className="songket-divider" />

            <div>
              <p className="text-xs font-semibold text-stone-700 mb-1.5">Kualiti Grafik 3D</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onQualityChange(q)}
                    className={`py-1.5 px-2 rounded-md text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                      quality === q
                        ? 'bg-emerald-800 text-amber-50 border-emerald-900'
                        : 'bg-white/70 text-stone-700 border-stone-300 hover:bg-white'
                    }`}
                  >
                    {q === 'low' ? 'Rendah' : q === 'medium' ? 'Sederhana' : 'Tinggi'}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between gap-2 py-1 cursor-pointer">
              <span className="text-xs font-medium text-stone-800">
                Kurangkan Pergerakan (Reduced Motion)
              </span>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={onToggleReducedMotion}
                className="w-4 h-4 accent-emerald-700"
              />
            </label>

            <label className="flex items-center justify-between gap-2 py-1 cursor-pointer">
              <span className="text-xs font-medium text-stone-800">
                Guna Paparan Alternatif 2D
              </span>
              <input
                type="checkbox"
                checked={use2DFallback}
                onChange={onToggle2DFallback}
                className="w-4 h-4 accent-emerald-700"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
