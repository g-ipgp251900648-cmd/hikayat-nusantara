import React, { useState } from 'react';
import {
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { QUIZ_QUESTIONS } from '../game/data';
import { AssessmentAttempt, QuizEvaluation } from '../game/rules';

interface QuizModalProps {
  answers: Record<string, string | undefined>;
  evaluation: QuizEvaluation | null;
  sequenceScore: number;
  attempts: AssessmentAttempt[];
  allMissionsReady: boolean;
  onSelectOption: (questionId: string, optionId: string) => void;
  onSubmitQuizCheck: () => void;
  onOpenStorybook: () => void;
  onCompleteMission: () => void;
  onClose: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  answers,
  evaluation,
  sequenceScore,
  attempts,
  allMissionsReady,
  onSelectOption,
  onSubmitQuizCheck,
  onOpenStorybook,
  onCompleteMission,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'quiz' | 'progress'>('quiz');
  const [showHintId, setShowHintId] = useState<string | null>(null);

  const allAnswered = QUIZ_QUESTIONS.every((q) => Boolean(answers[q.id]));
  const quizPerfect = Boolean(evaluation?.isComplete);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kuiz Detektif Pemahaman"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-6 bg-[#140d07]/75"
    >
      <div className="parchment-panel rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#b88b2e]/35 bg-[#f3e6c8]">
          <div>
            <h2 className="font-display text-lg md:text-xl font-bold text-[#2c1a0e]">
              Kuiz Detektif Pemahaman
            </h2>
            <p className="text-xs text-[#5b371e]">
              Jawab ketiga-tiga soalan berdasarkan kisah Cahaya Pelita di Desa Warisan (Jumlah pentaksiran: 8 markah).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#ecdcb9]">
              <button
                type="button"
                onClick={() => setActiveTab('quiz')}
                className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                  activeTab === 'quiz'
                    ? 'bg-[#0d5c46] text-[#faf3e0]'
                    : 'text-[#2c1a0e] hover:bg-[#faf3e0]/60'
                }`}
              >
                Soalan (3)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('progress')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                  activeTab === 'progress'
                    ? 'bg-[#0d5c46] text-[#faf3e0]'
                    : 'text-[#2c1a0e] hover:bg-[#faf3e0]/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Rekod & Graf ({attempts.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenStorybook}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#faf3e0] border border-[#b88b2e]/50 text-[#2c1a0e] hover:bg-[#ecdcb9] flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#0d5c46]" />
              <span className="hidden sm:inline">Rujuk Cerita</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup kuiz"
              className="p-1.5 rounded-lg text-[#4a2e1b] hover:bg-[#ecdcb9] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto hikayat-scroll p-4 md:p-6">
          {activeTab === 'quiz' ? (
            <div className="space-y-5">
              {QUIZ_QUESTIONS.map((q, qIdx) => {
                const selected = answers[q.id];
                const checked = evaluation !== null;
                const isCorrect = evaluation?.perQuestionCorrect[q.id];

                return (
                  <div
                    key={q.id}
                    className="rounded-xl p-4 md:p-5 bg-[#fffcf2] border-2 border-[#c89b3c]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display font-bold text-base md:text-lg text-[#2c1a0e]">
                        {qIdx + 1}. {q.question}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowHintId((cur) => (cur === q.id ? null : q.id))}
                        className="px-2.5 py-1 rounded-lg bg-[#f3e6c8] text-xs font-semibold text-[#0d5c46] hover:bg-[#ecdcb9] flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Petunjuk</span>
                      </button>
                    </div>

                    {showHintId === q.id && (
                      <p className="mt-2 px-3 py-2 rounded-lg bg-[#0d5c46]/10 text-xs text-[#064e3b] font-medium">
                        Pelita Pembimbing: {q.hint}
                      </p>
                    )}

                    <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt) => {
                        const isSelected = selected === opt.id;
                        let styleClass =
                          'bg-[#faf3e0] border-[#b88b2e]/45 text-[#2c1a0e] hover:bg-[#f3e6c8]';
                        if (isSelected && !checked) {
                          styleClass =
                            'bg-[#0d5c46] border-[#d4af37] text-[#faf3e0] font-semibold';
                        } else if (checked && isSelected && isCorrect) {
                          styleClass =
                            'bg-[#064e3b] border-[#10b981] text-[#faf3e0] font-semibold';
                        } else if (checked && isSelected && !isCorrect) {
                          styleClass =
                            'bg-[#991b1b] border-[#f87171] text-[#faf3e0] font-semibold';
                        }

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onSelectOption(q.id, opt.id)}
                            className={`text-left px-4 py-3 rounded-xl border-2 text-sm transition-colors flex items-center justify-between gap-2 cursor-pointer ${styleClass}`}
                          >
                            <span>{opt.label}</span>
                            {checked && isSelected && isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-[#6ee7b7] shrink-0" />
                            )}
                            {checked && isSelected && !isCorrect && (
                              <XCircle className="w-4 h-4 text-[#fecaca] shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {checked && !isCorrect && (
                      <div className="mt-3 p-3 rounded-lg bg-[#fef2f2] border border-[#fca5a5] text-xs md:text-sm text-[#7f1d1d]">
                        {q.wrongExplanation}
                      </div>
                    )}
                    {checked && isCorrect && (
                      <div className="mt-3 p-2.5 rounded-lg bg-[#ecfdf5] border border-[#6ee7b7] text-xs md:text-sm text-[#064e3b] font-medium">
                        Jawapan tepat! Syabas, pengembara muda.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <AttemptProgressView attempts={attempts} />
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-[#b88b2e]/35 bg-[#f3e6c8]">
          <div className="text-xs font-semibold text-[#4a2e1b] tabular-nums">
            Susunan: {sequenceScore}/5 · Pemahaman:{' '}
            {evaluation ? `${evaluation.correctCount}/3` : 'Belum disemak'} · Jumlah:{' '}
            {evaluation ? `${sequenceScore + evaluation.correctCount}/8` : `${sequenceScore}/8`}
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === 'quiz' && (
              <button
                type="button"
                data-testid="submit-quiz-btn"
                disabled={!allAnswered}
                onClick={onSubmitQuizCheck}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold ${
                  allAnswered
                    ? 'emerald-cta cursor-pointer'
                    : 'bg-[#ecdcb9] text-[#5b371e] opacity-60 cursor-not-allowed'
                }`}
              >
                Semak Jawapan & Rekod
              </button>
            )}

            {quizPerfect && allMissionsReady && (
              <button
                type="button"
                data-testid="complete-mission-btn"
                onClick={onCompleteMission}
                className="gold-cta px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Pulihkan Kitab Warisan!</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AttemptProgressView: React.FC<{ attempts: AssessmentAttempt[] }> = ({ attempts }) => {
  if (attempts.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-[#fffcf2] border border-[#b88b2e]/40">
        <Award className="w-10 h-10 text-[#b48327] mx-auto mb-2" />
        <p className="font-display font-bold text-[#2c1a0e]">Belum Ada Rekod Percubaan</p>
        <p className="text-sm text-[#5b371e] mt-1">
          Tekan “Semak Jawapan & Rekod” selepas memilih ketiga-tiga jawapan untuk melihat graf pencapaian kamu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Simple Bar/Line SVG Chart of Attempt Percentage */}
      <div className="rounded-xl p-4 bg-[#fffcf2] border border-[#c89b3c]">
        <h3 className="font-display font-bold text-base text-[#2c1a0e] mb-3">
          Graf Perkembangan Pencapaian (Markah Penuh: 8)
        </h3>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 560 180"
            className="w-full max-w-xl h-44 mx-auto"
            role="img"
            aria-label="Graf pencapaian setiap percubaan"
          >
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((pct) => {
              const y = 145 - (pct / 100) * 115;
              return (
                <g key={pct}>
                  <line x1="48" y1={y} x2="535" y2={y} stroke="#e5d3a8" strokeWidth="1" />
                  <text x="10" y={y + 4} fontSize="11" fill="#5b371e">
                    {pct}%
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {attempts.map((a, idx) => {
              const slotW = Math.min(64, Math.floor(460 / Math.max(attempts.length, 1)));
              const bx = 60 + idx * (slotW + 12);
              const barH = (a.percentage / 100) * 115;
              const by = 145 - barH;
              return (
                <g key={a.attemptNumber}>
                  <rect
                    x={bx}
                    y={by}
                    width={Math.max(24, slotW - 10)}
                    height={Math.max(4, barH)}
                    rx="4"
                    fill={a.totalScore === 8 ? '#0d5c46' : '#d4af37'}
                  />
                  <text
                    x={bx + Math.max(24, slotW - 10) / 2}
                    y={by - 6}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="#2c1a0e"
                  >
                    {a.totalScore}/8
                  </text>
                  <text
                    x={bx + Math.max(24, slotW - 10) / 2}
                    y="165"
                    textAnchor="middle"
                    fontSize="11"
                    fill="#5b371e"
                  >
                    #{a.attemptNumber}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Attempt Records Table */}
      <div className="rounded-xl overflow-hidden border border-[#c89b3c] bg-[#fffcf2]">
        <table className="w-full text-left border-collapse text-xs md:text-sm">
          <thead className="bg-[#f3e6c8] text-[#2c1a0e]">
            <tr>
              <th className="px-3 py-2.5 font-bold">Percubaan</th>
              <th className="px-3 py-2.5 font-bold">Susunan</th>
              <th className="px-3 py-2.5 font-bold">Pemahaman</th>
              <th className="px-3 py-2.5 font-bold">Jumlah</th>
              <th className="px-3 py-2.5 font-bold">Peratus</th>
              <th className="px-3 py-2.5 font-bold">Tarikh & Masa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ecdcb9] tabular-nums">
            {attempts.map((a) => (
              <tr key={a.attemptNumber} className="text-[#2c1a0e]">
                <td className="px-3 py-2 font-semibold">#{a.attemptNumber}</td>
                <td className="px-3 py-2">{a.sequenceScore}/5</td>
                <td className="px-3 py-2">{a.quizScore}/3</td>
                <td className="px-3 py-2 font-bold text-[#064e3b]">{a.totalScore}/8</td>
                <td className="px-3 py-2 font-semibold">{a.percentage}%</td>
                <td className="px-3 py-2 text-[#5b371e]">
                  {new Date(a.timestampIso).toLocaleString('ms-MY', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
