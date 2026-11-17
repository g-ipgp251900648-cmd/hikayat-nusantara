import React from 'react';
import { Monitor, Play, Sparkles } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  lowGraphics: boolean;
  onToggleLowGraphics: () => void;
  reduceMotion: boolean;
  onToggleReduceMotion: () => void;
  mode2D: boolean;
  onToggleMode2D: () => void;
  savedXp: number;
  hasBadge: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  lowGraphics,
  onToggleLowGraphics,
  reduceMotion,
  onToggleReduceMotion,
  mode2D,
  onToggleMode2D,
  savedXp,
  hasBadge,
}) => {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-10 pointer-events-none">
      {/* Top subtle crest & earned progress summary */}
      <div className="flex items-start justify-between gap-4">
        <div
          className="pointer-events-auto px-4 py-2.5 rounded-xl wood-hud-panel"
          style={{ maxWidth: '340px' }}
        >
          <p className="text-xs font-medium tracking-wide text-[#fde68a]">
            Bahasa Melayu Tahun 5 · Misi 1
          </p>
          <p className="text-xs text-[#ecdcb9] mt-0.5 tabular-nums">
            {savedXp} XP {hasBadge ? '· Lencana Penjaga Naskhah' : '· Belum Selesai'}
          </p>
        </div>

        {/* Accessibility & Graphics quick toggles */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onToggleLowGraphics}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              lowGraphics
                ? 'bg-[#d4af37] text-[#2c1a0e] border-[#fef3c7]'
                : 'bg-[#22150c]/90 text-[#faf3e0] border-[#d4af37]/50 hover:border-[#d4af37]'
            }`}
          >
            Grafik Rendah: {lowGraphics ? 'Aktif' : 'Biasa'}
          </button>
          <button
            type="button"
            onClick={onToggleReduceMotion}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              reduceMotion
                ? 'bg-[#d4af37] text-[#2c1a0e] border-[#fef3c7]'
                : 'bg-[#22150c]/90 text-[#faf3e0] border-[#d4af37]/50 hover:border-[#d4af37]'
            }`}
          >
            Kurangkan Animasi: {reduceMotion ? 'Ya' : 'Tidak'}
          </button>
          <button
            type="button"
            onClick={onToggleMode2D}
            className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              mode2D
                ? 'bg-[#d4af37] text-[#2c1a0e] border-[#fef3c7]'
                : 'bg-[#22150c]/90 text-[#faf3e0] border-[#d4af37]/50 hover:border-[#d4af37]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{mode2D ? 'Mod 2D Aktif' : 'Mod 3D'}</span>
          </button>
        </div>
      </div>

      {/* Main Title Emblem positioned cleanly so live 3D village remains visible */}
      <div className="my-auto max-w-xl pointer-events-auto">
        <div className="parchment-panel rounded-2xl p-6 md:p-8 relative overflow-hidden">
          {/* Traditional Nusantara SVG Ornamental Crest */}
          <div className="flex items-center gap-3 mb-3">
            <svg
              width="44"
              height="44"
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <circle cx="24" cy="24" r="21" fill="#0D5C46" stroke="#D4AF37" strokeWidth="2.5" />
              <path
                d="M24 8L28.5 18.5L39 20L31 27.5L33 38L24 33L15 38L17 27.5L9 20L19.5 18.5L24 8Z"
                fill="#FDE68A"
                stroke="#9A6E17"
                strokeWidth="1.5"
              />
              <circle cx="24" cy="24" r="4.5" fill="#064E3B" />
            </svg>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0d5c46]">
                Pengembaraan Pendidikan Interaktif 3D
              </span>
            </div>
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-bold text-[#2c1a0e] leading-tight text-balance">
            Hikayat Nusantara: Misteri Lima Helaian Naskhah
          </h1>

          <p className="mt-3 text-sm md:text-base text-[#4a2e1b] leading-relaxed">
            Terokai Desa Hikayat dan Rumah Naskhah Pusaka bersama Hang Tuah untuk mencari lima helaian kitab yang hilang, membaca kisah warisan, menyusun peristiwa serta menyelesaikan kuiz pemahaman.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="emerald-cta px-6 py-3.5 rounded-xl font-semibold text-base flex items-center gap-2.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#d4af37]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Mula Pengembaraan</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#5b371e] px-2">
              <Sparkles className="w-4 h-4 text-[#b48327]" />
              <span>Ganjaran: 60 XP · Lencana Penjaga Naskhah</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom flat borderless control hint */}
      <div className="flex justify-center">
        <p className="px-4 py-1.5 rounded-lg bg-[#22150c]/85 text-[#faf3e0] text-xs font-medium tracking-wide">
          WASD / Anak Panah untuk Berjalan · E untuk Periksa · Tekan Enter atau Mula Pengembaraan
        </p>
      </div>
    </div>
  );
};
