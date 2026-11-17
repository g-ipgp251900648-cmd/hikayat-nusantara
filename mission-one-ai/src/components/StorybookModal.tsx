import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
} from 'lucide-react';
import { STORY_PAGES } from '../game/data';
import {
  isSpeechNarrationSupported,
  speakMalayNarration,
  stopNarration,
} from '../game/audio';

interface StorybookModalProps {
  readPages: number[];
  onMarkPageRead: (pageNumber: number) => void;
  onProceedToSequencing: () => void;
  onClose: () => void;
}

export const StorybookModal: React.FC<StorybookModalProps> = ({
  readPages,
  onMarkPageRead,
  onProceedToSequencing,
  onClose,
}) => {
  const [pageIdx, setPageIdx] = useState(0);
  const [largeText, setLargeText] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const [flipState, setFlipState] = useState<'idle' | 'flipping'>('idle');
  const [imgErrorMap, setImgErrorMap] = useState<Record<number, boolean>>({});

  const currentPage = STORY_PAGES[pageIdx];
  const speechSupported = isSpeechNarrationSupported();
  const allRead = STORY_PAGES.every((p) => readPages.includes(p.pageNumber));

  useEffect(() => {
    onMarkPageRead(currentPage.pageNumber);
  }, [currentPage.pageNumber, onMarkPageRead]);

  useEffect(() => {
    return () => {
      stopNarration();
    };
  }, []);

  const goToPage = (nextIdx: number) => {
    if (nextIdx < 0 || nextIdx >= STORY_PAGES.length) return;
    stopNarration();
    setNarrating(false);
    setFlipState('flipping');
    window.setTimeout(() => {
      setPageIdx(nextIdx);
      setFlipState('idle');
    }, 160);
  };

  const handleToggleNarration = () => {
    if (narrating) {
      stopNarration();
      setNarrating(false);
    } else {
      const ok = speakMalayNarration(currentPage.narrationText, () => {
        setNarrating(false);
      });
      setNarrating(ok);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buku Cerita Digital Cahaya Pelita di Desa Warisan"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-6 bg-[#140d07]/75"
    >
      <div className="parchment-panel rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Book Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#b88b2e]/35 bg-[#f3e6c8]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#0d5c46]" />
            <div>
              <h2 className="font-display text-lg md:text-xl font-bold text-[#2c1a0e]">
                Cahaya Pelita di Desa Warisan
              </h2>
              <p className="text-xs text-[#5b371e] tabular-nums">
                Halaman {currentPage.pageNumber} daripada {STORY_PAGES.length} · Telah dibaca:{' '}
                {readPages.length}/{STORY_PAGES.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLargeText((v) => !v)}
              aria-label="Tukar saiz tulisan"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer ${
                largeText
                  ? 'bg-[#0d5c46] text-[#faf3e0] border-[#d4af37]'
                  : 'bg-[#faf3e0] text-[#2c1a0e] border-[#b88b2e]/50 hover:bg-[#ecdcb9]'
              }`}
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>{largeText ? 'Tulisan Besar' : 'Besarkan Teks'}</span>
            </button>

            {speechSupported && (
              <button
                type="button"
                onClick={handleToggleNarration}
                aria-label={narrating ? 'Henti bacaan' : 'Dengar cerita'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer ${
                  narrating
                    ? 'bg-[#d4af37] text-[#2c1a0e] border-[#9a6e17]'
                    : 'bg-[#faf3e0] text-[#2c1a0e] border-[#b88b2e]/50 hover:bg-[#ecdcb9]'
                }`}
              >
                {narrating ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{narrating ? 'Henti Suara' : 'Dengar Cerita'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                stopNarration();
                onClose();
              }}
              aria-label="Tutup buku cerita"
              className="p-1.5 rounded-lg text-[#4a2e1b] hover:bg-[#ecdcb9] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Book Spread Content */}
        <div
          className={`flex-1 overflow-y-auto hikayat-scroll p-5 md:p-7 transition-opacity duration-150 ${
            flipState === 'flipping' ? 'opacity-25' : 'opacity-100'
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Illustration Frame */}
            <div className="md:col-span-6">
              <div className="rounded-xl overflow-hidden border-2 border-[#b88b2e] shadow-md bg-[#ecdcb9] aspect-[4/3]">
                {!imgErrorMap[currentPage.pageNumber] ? (
                  <img
                    src={currentPage.imagePath}
                    alt={currentPage.title}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setImgErrorMap((prev) => ({
                        ...prev,
                        [currentPage.pageNumber]: true,
                      }))
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#0d5c46] to-[#2c1a0e] text-[#faf3e0]">
                    <BookOpen className="w-10 h-10 text-[#fde68a] mb-2" />
                    <p className="font-display font-bold">{currentPage.title}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Reading Prose */}
            <div className="md:col-span-6 flex flex-col justify-between">
              <div>
                <h3 className="font-display text-xl md:text-2xl font-bold text-[#064e3b]">
                  {currentPage.title}
                </h3>
                <p
                  className={`mt-4 text-[#2c1a0e] leading-relaxed ${
                    largeText ? 'text-lg md:text-xl leading-loose' : 'text-base md:text-lg'
                  }`}
                >
                  {currentPage.text}
                </p>
              </div>

              {/* Page Selector Dots */}
              <div className="mt-6 flex items-center gap-2">
                {STORY_PAGES.map((p, idx) => {
                  const visited = readPages.includes(p.pageNumber);
                  const active = idx === pageIdx;
                  return (
                    <button
                      key={p.pageNumber}
                      type="button"
                      onClick={() => goToPage(idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#0d5c46] text-[#faf3e0] border-[#d4af37]'
                          : visited
                          ? 'bg-[#ecdcb9] text-[#064e3b] border-[#b88b2e]/50'
                          : 'bg-[#faf3e0] text-[#5b371e] border-[#b88b2e]/30'
                      }`}
                    >
                      {p.pageNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-[#b88b2e]/35 bg-[#f3e6c8]">
          <button
            type="button"
            disabled={pageIdx === 0}
            onClick={() => goToPage(pageIdx - 1)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 border ${
              pageIdx === 0
                ? 'opacity-45 cursor-not-allowed border-[#b88b2e]/30 text-[#5b371e]'
                : 'border-[#b88b2e] text-[#2c1a0e] hover:bg-[#ecdcb9] cursor-pointer'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Halaman Sebelumnya</span>
          </button>

          <div className="flex items-center gap-2.5">
            {pageIdx < STORY_PAGES.length - 1 ? (
              <button
                type="button"
                onClick={() => goToPage(pageIdx + 1)}
                className="emerald-cta px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Halaman Seterusnya</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!allRead}
                onClick={() => {
                  stopNarration();
                  onProceedToSequencing();
                }}
                className={`px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                  allRead
                    ? 'gold-cta cursor-pointer'
                    : 'bg-[#ecdcb9] text-[#5b371e] opacity-65 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {allRead
                    ? 'Teruskan ke Susun Naskhah'
                    : `Baca Semua 5 Halaman (${readPages.length}/5)`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
