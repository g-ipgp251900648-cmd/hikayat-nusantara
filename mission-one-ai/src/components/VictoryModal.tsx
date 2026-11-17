import React from 'react';
import { Award, Home, RotateCcw, Sparkles } from 'lucide-react';
import { AssessmentAttempt } from '../game/rules';
import { AttemptProgressView } from './QuizModal';

interface VictoryModalProps {
  xpTotal: number;
  newlyGrantedXp: boolean;
  attempts: AssessmentAttempt[];
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  xpTotal,
  newlyGrantedXp,
  attempts,
  onPlayAgain,
  onBackToMenu,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tahniah! Kitab Warisan Berjaya Dipulihkan"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#140d07]/55"
    >
      <div className="parchment-panel rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto hikayat-scroll p-5 md:p-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0d5c46] border-2 border-[#d4af37] flex items-center justify-center shadow-lg">
          <Award className="w-7 h-7 text-[#fde68a]" />
        </div>

        <h2 className="mt-3 font-display text-xl md:text-2xl font-bold text-[#064e3b] text-balance">
          TAHNIAH, PENGEMBARA MUDA! KAMU BERJAYA MEMULIHKAN KITAB WARISAN!
        </h2>

        <p className="mt-1.5 text-sm text-[#4a2e1b] max-w-xl mx-auto">
          Pelita Warisan kini menyala terang dan lima helaian kisah telah kembali bersatu bersama Hang Tuah di Rumah Naskhah Pusaka.
        </p>

        {/* Mastery Metrics & Reward Tiles */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
          <div className="p-3 rounded-xl bg-[#064e3b] text-[#faf3e0] border border-[#d4af37]">
            <p className="text-[11px] uppercase tracking-wide text-[#fde68a]">Ganjaran XP</p>
            <p className="mt-0.5 font-display text-xl font-bold tabular-nums">
              {newlyGrantedXp ? '+60 XP' : `${xpTotal} XP`}
            </p>
            <p className="text-[11px] text-[#ecdcb9] tabular-nums">
              Terkumpul: {xpTotal} XP
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#f3e6c8] border border-[#b88b2e]">
            <p className="text-[11px] uppercase tracking-wide text-[#5b371e]">Lencana Diperoleh</p>
            <p className="mt-0.5 font-display text-base font-bold text-[#2c1a0e] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#b48327]" />
              <span>Penjaga Naskhah</span>
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#f3e6c8] border border-[#b88b2e]">
            <p className="text-[11px] uppercase tracking-wide text-[#5b371e]">Markah Akhir</p>
            <p className="mt-0.5 font-display text-xl font-bold text-[#064e3b] tabular-nums">
              8/8 (100%)
            </p>
          </div>
        </div>

        <div className="mt-4 text-left">
          <AttemptProgressView attempts={attempts} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="emerald-cta px-6 py-3 rounded-xl font-semibold text-sm md:text-base flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Main Semula</span>
          </button>
          <button
            type="button"
            onClick={onBackToMenu}
            className="gold-cta px-6 py-3 rounded-xl font-semibold text-sm md:text-base flex items-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
