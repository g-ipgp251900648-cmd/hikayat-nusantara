import React, { useEffect, useState } from 'react';
import { BookOpen, Compass, Flame, MapPin, Sparkles } from 'lucide-react';
import { KITAB_STATION, SCROLL_STATIONS, ScrollId } from '../game/data';
import { NearbyInteractable } from './WorldCanvas';

interface Fallback2DExplorerProps {
  foundScrolls: ScrollId[];
  onInspectTarget: (target: NearbyInteractable) => void;
}

export const Fallback2DExplorer: React.FC<Fallback2DExplorerProps> = ({
  foundScrolls,
  onInspectTarget,
}) => {
  // Interactive 2D top-down Rumah Naskhah Pusaka explorer (WASD / Clickable stations)
  const [pos, setPos] = useState({ x: 0, z: 2.2 });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const step = 0.7;
      setPos((prev) => {
        let nx = prev.x;
        let nz = prev.z;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') nx -= step;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') nx += step;
        if (e.code === 'KeyW' || e.code === 'ArrowUp') nz -= step;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') nz += step;
        return {
          x: Math.max(-5.8, Math.min(5.8, nx)),
          z: Math.max(-5.8, Math.min(4.8, nz)),
        };
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toPct = (x: number, z: number) => ({
    left: `${((x + 6.5) / 13) * 100}%`,
    top: `${((z + 6.5) / 12) * 100}%`,
  });

  const handleStationClick = (kind: 'scroll' | 'kitab', id: ScrollId | 'kitab', label: string, tx: number, tz: number) => {
    setPos({ x: tx, z: tz });
    onInspectTarget({ kind, id, label });
  };

  return (
    <div
      data-testid="fallback-2d-viewport"
      className="w-full h-full flex items-center justify-center p-4 pt-28 pb-16"
      style={{
        background: 'radial-gradient(circle at 50% 35%, #2f4f38 0%, #1d2d22 65%, #141c16 100%)',
      }}
    >
      <div className="w-full max-w-3xl parchment-panel rounded-2xl p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-[#b88b2e]/30 pb-2.5">
          <div>
            <h2 className="font-display text-lg md:text-xl font-bold text-[#2c1a0e]">
              Pelan Interaktif Rumah Naskhah Pusaka (Mod 2D)
            </h2>
            <p className="text-xs md:text-sm text-[#5b371e]">
              Gunakan kekunci WASD / Anak Panah atau klik mana-mana lokasi di dalam rumah untuk meneroka bersama Hang Tuah.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#064e3b] tabular-nums">
            {foundScrolls.length}/5 Helaian Ditemukan
          </span>
        </div>

        {/* Interactive wooden floor plan */}
        <div
          className="relative w-full aspect-[13/9] rounded-xl overflow-hidden border-4 border-[#4a2e1b] shadow-inner"
          style={{
            backgroundColor: '#784826',
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(44,26,14,0.22) 0px, rgba(44,26,14,0.22) 2px, transparent 2px, transparent 36px)',
          }}
        >
          {/* Tikar mengkuang center mat */}
          <div
            className="absolute border-2 border-[#7c2d12]/70 rounded-md"
            style={{
              left: '28%',
              top: '20%',
              width: '44%',
              height: '38%',
              backgroundColor: '#d9bf83',
              opacity: 0.9,
            }}
          />

          {/* Doorway indicator at bottom */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#2c1a0e] text-[#faf3e0] text-xs font-medium rounded-t-md">
            Pintu Utama & Serambi
          </div>

          {/* 5 Scroll Stations */}
          {SCROLL_STATIONS.map((st) => {
            const isFound = foundScrolls.includes(st.id);
            const displayX = st.id === 'pelita' ? -2.7 : st.worldPos.x;
            const displayZ = st.id === 'pelita' ? -2.5 : st.worldPos.z;
            const coords = toPct(displayX, displayZ);
            return (
              <button
                key={st.id}
                type="button"
                onClick={() =>
                  handleStationClick('scroll', st.id, st.inspectPrompt, st.approachPos.x, st.approachPos.z)
                }
                style={coords}
                className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-[#d4af37] ${
                  isFound
                    ? 'bg-[#064e3b]/85 text-[#ecfdf5] border border-[#34d399]/50'
                    : 'bg-[#fef3c7] text-[#2c1a0e] border-2 border-[#d4af37] shadow-md'
                }`}
              >
                {st.id === 'pelita' ? (
                  <Flame className="w-3.5 h-3.5 text-[#b45309]" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-[#0d5c46]" />
                )}
                <span>{st.locationName}</span>
                {isFound ? ' (Selesai)' : ''}
              </button>
            );
          })}

          {/* Central Kitab Warisan */}
          <button
            type="button"
            onClick={() =>
              handleStationClick(
                'kitab',
                'kitab',
                foundScrolls.length >= 5 ? 'Baca Kitab Warisan' : 'Kitab Warisan',
                KITAB_STATION.approachPos.x,
                KITAB_STATION.approachPos.z
              )
            }
            style={toPct(KITAB_STATION.worldPos.x, KITAB_STATION.worldPos.z)}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-3.5 py-2.5 rounded-xl bg-[#0d5c46] text-[#faf3e0] border-2 border-[#d4af37] shadow-lg text-xs font-bold flex items-center gap-1.5 hover:bg-[#064e3b]"
          >
            <BookOpen className="w-4 h-4 text-[#fde68a]" />
            <span>Kitab Warisan</span>
            {foundScrolls.length >= 5 && <Sparkles className="w-3.5 h-3.5 text-[#fde68a]" />}
          </button>

          {/* Hang Tuah Marker */}
          <div
            style={toPct(pos.x, pos.z)}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-150 flex flex-col items-center"
          >
            <div className="w-9 h-9 rounded-full bg-[#0d5c46] border-2 border-[#d4af37] shadow-lg flex items-center justify-center text-[#faf3e0]">
              <Compass className="w-4 h-4" />
            </div>
            <span className="mt-1 px-2 py-0.5 rounded bg-[#2c1a0e] text-[#faf3e0] text-[11px] font-semibold whitespace-nowrap">
              Hang Tuah
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
