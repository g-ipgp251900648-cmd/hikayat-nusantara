import React, { useState } from 'react';
import { CheckCircle2, HelpCircle, ScrollText, ArrowRight } from 'lucide-react';
import type { CheckpointDefinition, CheckpointOption } from '../game/types';

interface CheckpointModalProps {
  checkpoint: CheckpointDefinition;
  isAlternativePath: boolean;
  onAttemptOption: (option: CheckpointOption, attemptNumber: number) => void;
  onContinueFlight: () => void;
}

export const CheckpointModal: React.FC<CheckpointModalProps> = ({
  checkpoint,
  isAlternativePath,
  onAttemptOption,
  onContinueFlight,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const handleSelect = (opt: CheckpointOption) => {
    if (solved) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setSelectedId(opt.id);
    setFeedbackText(opt.feedback);
    onAttemptOption(opt, nextAttempts);
    if (opt.isCorrect) {
      setSolved(true);
    } else {
      setShowHint(true);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-stone-950/65">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkpoint-gate-title"
        className="parchment-surface rounded-2xl max-w-2xl w-full p-5 sm:p-7 text-stone-900 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="text-xs font-semibold text-emerald-800 tracking-wide">
            Checkpoint {checkpoint.index + 1} daripada 5 · {checkpoint.zoneName}
            {isAlternativePath ? ' · Laluan Bahasa Alternatif' : ''}
          </div>
          <button
            type="button"
            onClick={() => setShowHint((prev) => !prev)}
            className="text-xs font-medium text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            {showHint ? 'Sembunyikan Petunjuk' : 'Minta Petunjuk Hang Tuah'}
          </button>
        </div>

        <h2
          id="checkpoint-gate-title"
          className="font-display text-2xl sm:text-3xl font-bold text-emerald-950 mb-2"
        >
          {checkpoint.gateName}
        </h2>

        <p className="text-base sm:text-lg font-medium text-stone-800 mb-4 leading-relaxed">
          {checkpoint.question}
        </p>

        {showHint && !solved && (
          <div className="mb-4 rounded-xl bg-amber-100/90 border border-amber-300 px-4 py-3 text-sm text-amber-950">
            <span className="font-semibold">Petunjuk Hang Tuah: </span>
            {checkpoint.hint}
          </div>
        )}

        <div className="space-y-2.5 mb-5">
          {checkpoint.options.map((opt, idx) => {
            const isSelected = selectedId === opt.id;
            const statusClass =
              isSelected && opt.isCorrect
                ? 'bg-emerald-50 border-emerald-700 text-emerald-950'
                : isSelected && !opt.isCorrect
                  ? 'bg-rose-50 border-rose-400 text-rose-950'
                  : 'bg-white/90 border-stone-300 text-stone-800 hover:border-amber-600 hover:bg-amber-50/60';

            return (
              <button
                key={opt.id}
                type="button"
                disabled={solved}
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-colors flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${statusClass}`}
              >
                <span className="text-sm sm:text-base font-medium">
                  <span className="font-mono-num font-bold mr-2.5 text-amber-800">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  {opt.text}
                </span>
                {isSelected && opt.isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {feedbackText && (
          <div
            className={`rounded-xl p-4 mb-5 border text-sm leading-relaxed ${
              solved
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-amber-50 border-amber-300 text-stone-800'
            }`}
          >
            <p className="font-semibold mb-1">
              {solved ? 'Jawapan Tepat!' : 'Cuba Sekali Lagi'}
            </p>
            <p>{solved ? checkpoint.hangTuahExplanation : feedbackText}</p>

            {solved && (
              <div className="mt-3 pt-3 border-t border-emerald-200 flex items-start gap-2.5">
                <ScrollText className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-emerald-800">
                    Ungkapan Masuk ke Bank Kata Warisan:
                  </div>
                  <div className="font-display text-lg font-bold text-amber-900">
                    “{checkpoint.phrase}”
                  </div>
                  <div className="text-xs text-stone-700 mt-1">
                    Contoh: {checkpoint.phraseExample}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {solved && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onContinueFlight}
              className="px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-amber-50 font-semibold text-sm flex items-center gap-2 cursor-pointer"
            >
              <span>
                {isAlternativePath
                  ? checkpoint.index === 4
                    ? 'Masuk ke Balai Olah Hikayat'
                    : 'Ke Gerbang Seterusnya'
                  : checkpoint.index === 4
                    ? 'Terbang ke Gerbang Balai Olah Hikayat'
                    : 'Buka Gerbang & Teruskan Penerbangan'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
