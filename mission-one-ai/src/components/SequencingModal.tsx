import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  GripVertical,
  HelpCircle,
  Sparkles,
  X,
} from 'lucide-react';
import { SequenceEvent } from '../game/data';
import { SequenceEvaluation } from '../game/rules';

interface SequencingModalProps {
  cards: SequenceEvent[];
  evaluation: SequenceEvaluation | null;
  onChangeOrder: (nextCards: SequenceEvent[]) => void;
  onCheckSequence: () => void;
  onOpenStorybook: () => void;
  onProceedToQuiz: () => void;
  onClose: () => void;
}

export const SequencingModal: React.FC<SequencingModalProps> = ({
  cards,
  evaluation,
  onChangeOrder,
  onCheckSequence,
  onOpenStorybook,
  onProceedToQuiz,
  onClose,
}) => {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);

  const moveCard = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= cards.length || fromIdx === toIdx) return;
    const next = [...cards];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onChangeOrder(next);
  };

  const isSolved = Boolean(evaluation?.isComplete);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cabaran Susun Naskhah Berselerak"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-6 bg-[#140d07]/75"
    >
      <div className="parchment-panel rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#b88b2e]/35 bg-[#f3e6c8]">
          <div>
            <h2 className="font-display text-lg md:text-xl font-bold text-[#2c1a0e]">
              Susun Naskhah Berselerak
            </h2>
            <p className="text-xs text-[#5b371e]">
              Helaian yang dikumpulkan masih tersusun secara rawak. Seret atau guna butang naik/turun untuk menyusun 5 peristiwa daripada awal hingga akhir.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenStorybook}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#faf3e0] border border-[#b88b2e]/50 text-[#2c1a0e] hover:bg-[#ecdcb9] flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#0d5c46]" />
              <span>Baca Semula Kisah</span>
            </button>
            <button
              type="button"
              onClick={() => setShowHint((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0d5c46] text-[#faf3e0] hover:bg-[#064e3b] flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#fde68a]" />
              <span>Petunjuk</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup susunan peristiwa"
              className="p-1.5 rounded-lg text-[#4a2e1b] hover:bg-[#ecdcb9] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto hikayat-scroll p-4 md:p-6 space-y-3">
          {showHint && (
            <div className="p-3.5 rounded-xl bg-[#0d5c46]/10 border border-[#0d5c46]/35 text-sm text-[#064e3b]">
              <strong>Hang Tuah (Pelita Pembimbing):</strong> Ingat kembali peristiwa yang berlaku sebelum kabus tebal melanda kampung, dan perhatikan bagaimana Melur memulakan penemuannya di tepi sungai.
            </div>
          )}

          {evaluation && (
            <div
              data-testid="sequence-feedback"
              className={`p-3.5 rounded-xl border text-sm font-medium flex items-center gap-2.5 ${
                isSolved
                  ? 'bg-[#064e3b] text-[#faf3e0] border-[#d4af37]'
                  : 'bg-[#fef3c7] text-[#4a2e1b] border-[#d4af37]'
              }`}
            >
              {isSolved ? (
                <Sparkles className="w-5 h-5 text-[#fde68a] shrink-0" />
              ) : (
                <HelpCircle className="w-5 h-5 text-[#9a6e17] shrink-0" />
              )}
              <span>{evaluation.feedback}</span>
            </div>
          )}

          <div className="space-y-2.5">
            {cards.map((card, idx) => {
              const cardChecked = evaluation !== null;
              const isCardCorrect = evaluation?.perCardCorrect[idx] ?? false;

              return (
                <div
                  key={card.id}
                  draggable={!isSolved}
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIdx !== null) {
                      moveCard(dragIdx, idx);
                      setDragIdx(null);
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                    isSolved
                      ? 'bg-[#ecfdf5] border-[#059669]'
                      : cardChecked && isCardCorrect
                      ? 'bg-[#f0fdf4] border-[#16a34a]'
                      : 'bg-[#fffcf2] border-[#c89b3c] hover:border-[#9a6e17]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[#9a6e17] shrink-0">
                    <GripVertical className="w-4 h-4 hidden sm:block" />
                    <span className="w-7 h-7 rounded-lg bg-[#0d5c46] text-[#faf3e0] font-display font-bold text-sm flex items-center justify-center tabular-nums">
                      {idx + 1}
                    </span>
                  </div>

                  <img
                    src={card.imagePath}
                    alt={card.title}
                    referrerPolicy="no-referrer"
                    className="w-16 h-12 rounded-lg object-cover border border-[#b88b2e]/60 shrink-0 hidden sm:block"
                  />

                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-sm md:text-base text-[#2c1a0e]">
                      {card.title}
                    </h3>
                    <p className="text-xs md:text-sm text-[#4a2e1b] line-clamp-2">
                      {card.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {cardChecked && isCardCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-[#059669] mr-1" aria-label="Kedudukan betul" />
                    )}
                    <button
                      type="button"
                      disabled={idx === 0 || isSolved}
                      onClick={() => moveCard(idx, idx - 1)}
                      aria-label={`Naikkan peristiwa ${card.title}`}
                      className="p-2 rounded-lg border border-[#b88b2e]/50 bg-[#f3e6c8] hover:bg-[#ecdcb9] disabled:opacity-35 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4 text-[#2c1a0e]" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === cards.length - 1 || isSolved}
                      onClick={() => moveCard(idx, idx + 1)}
                      aria-label={`Turunkan peristiwa ${card.title}`}
                      className="p-2 rounded-lg border border-[#b88b2e]/50 bg-[#f3e6c8] hover:bg-[#ecdcb9] disabled:opacity-35 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4 text-[#2c1a0e]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-[#b88b2e]/35 bg-[#f3e6c8]">
          <p className="text-xs font-medium text-[#5b371e] tabular-nums">
            Markah Susunan: {evaluation ? `${evaluation.correctCount}/5` : 'Belum disemak'}
          </p>
          <div className="flex items-center gap-2.5">
            {!isSolved ? (
              <button
                type="button"
                data-testid="check-sequence-btn"
                onClick={onCheckSequence}
                className="emerald-cta px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Semak Urutan
              </button>
            ) : (
              <button
                type="button"
                onClick={onProceedToQuiz}
                className="gold-cta px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <span>Teruskan ke Detektif Pemahaman</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
