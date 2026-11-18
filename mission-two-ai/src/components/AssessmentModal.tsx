import React from 'react';
import { X, BarChart3 } from 'lucide-react';
import { CHECKPOINTS } from '../game/data';
import { computeCheckpointAccuracyStats } from '../game/storage';
import type { PersistedMission2State } from '../game/types';
import { evaluateDraftCompleteness } from '../game/writing';

interface AssessmentModalProps {
  state: PersistedMission2State;
  onClose: () => void;
}

export const AssessmentModal: React.FC<AssessmentModalProps> = ({
  state,
  onClose,
}) => {
  const accuracy = computeCheckpointAccuracyStats(state.checkpointRecords);
  const completeness = evaluateDraftCompleteness(state.draft);
  const attempts = state.attemptHistory;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rekod Pentaksiran dan Graf Perkembangan"
        className="parchment-surface rounded-2xl max-w-3xl w-full p-5 sm:p-7 text-stone-900 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-800" />
            <h2 className="font-display text-2xl font-bold text-emerald-950">
              Rekod Pencapaian &amp; Graf Perkembangan
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Rekod"
            className="p-1.5 rounded-lg hover:bg-amber-900/10 text-stone-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-600 mb-4">
          Rekod latihan setempat ini memisahkan kemahiran kawalan penerbangan Wau Sakti daripada penguasaan Bahasa Melayu.
        </p>

        {/* Two Separated Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* Pillar 1: Flight Skill */}
          <div className="rounded-xl bg-white/85 border border-amber-300 p-4">
            <h3 className="font-display text-base font-bold text-amber-900 mb-2">
              1. Pencapaian Permainan (Penerbangan)
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-amber-50">
                <div className="text-stone-600">Jumlah Percubaan</div>
                <div className="font-mono-num text-lg font-bold text-stone-900">
                  {attempts.length}
                </div>
              </div>
              <div className="p-2 rounded bg-amber-50">
                <div className="text-stone-600">Skor Terbang Terbaik</div>
                <div className="font-mono-num text-lg font-bold text-stone-900">
                  {state.flightScore}
                </div>
              </div>
              <div className="p-2 rounded bg-amber-50">
                <div className="text-stone-600">Perlanggaran Terakhir</div>
                <div className="font-mono-num text-lg font-bold text-stone-900">
                  {state.lastRunStats.collisions}
                </div>
              </div>
              <div className="p-2 rounded bg-amber-50">
                <div className="text-stone-600">Baki Hati Terakhir</div>
                <div className="font-mono-num text-lg font-bold text-stone-900">
                  {state.lastRunStats.heartsRemaining}/3
                </div>
              </div>
            </div>
          </div>

          {/* Pillar 2: Bahasa Melayu Mastery */}
          <div className="rounded-xl bg-white/85 border border-emerald-300 p-4">
            <h3 className="font-display text-base font-bold text-emerald-950 mb-2">
              2. Penguasaan Bahasa Melayu
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-emerald-50">
                <div className="text-stone-600">Tepat Cubaan Pertama</div>
                <div className="font-mono-num text-lg font-bold text-emerald-900">
                  {accuracy.firstTryCount}/{CHECKPOINTS.length} ({accuracy.firstTryPct}%)
                </div>
              </div>
              <div className="p-2 rounded bg-emerald-50">
                <div className="text-stone-600">Dikuasai Selepas Bimbingan</div>
                <div className="font-mono-num text-lg font-bold text-emerald-900">
                  {accuracy.masteredCount}/{CHECKPOINTS.length}
                </div>
              </div>
              <div className="p-2 rounded bg-emerald-50">
                <div className="text-stone-600">Ungkapan Digunakan</div>
                <div className="font-mono-num text-lg font-bold text-emerald-900">
                  {completeness.usedPhrases.length}/5
                </div>
              </div>
              <div className="p-2 rounded bg-emerald-50">
                <div className="text-stone-600">Status Penulisan</div>
                <div className="text-sm font-bold text-emerald-900 mt-0.5">
                  {state.missionCompleted
                    ? 'Selesai (+90 XP)'
                    : completeness.isComplete
                      ? 'Lengkap Disemak'
                      : 'Dalam Proses'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real-Data Progress Chart */}
        <div className="rounded-xl bg-white/90 border border-stone-300 p-4">
          <h3 className="font-display text-base font-bold text-stone-900 mb-2">
            Graf Perkembangan Ketepatan Checkpoint Mengikut Percubaan
          </h3>

          {attempts.length === 0 ? (
            <div className="py-8 text-center text-sm text-stone-600 bg-stone-50 rounded-lg border border-dashed border-stone-300">
              Belum ada rekod percubaan. Selesaikan satu sesi penerbangan atau laluan checkpoint untuk melihat graf perkembangan sebenar kamu.
            </div>
          ) : (
            <div>
              <svg
                viewBox="0 0 540 160"
                className="w-full h-40 overflow-visible"
                role="img"
                aria-label="Graf peratusan ketepatan jawapan pertama mengikut percubaan"
              >
                {/* Horizontal grid lines */}
                {[0, 50, 100].map((val) => {
                  const y = 130 - (val / 100) * 100;
                  return (
                    <g key={val}>
                      <line
                        x1="40"
                        y1={y}
                        x2="520"
                        y2={y}
                        stroke="#e7e5e4"
                        strokeWidth="1"
                      />
                      <text
                        x="32"
                        y={y + 4}
                        textAnchor="end"
                        fontSize="10"
                        fill="#57534e"
                      >
                        {val}%
                      </text>
                    </g>
                  );
                })}

                {attempts.map((att, idx) => {
                  const barW = Math.min(38, 440 / attempts.length - 8);
                  const step = 460 / Math.max(1, attempts.length);
                  const x = 50 + idx * step;
                  const h = (att.firstTryAccuracyPct / 100) * 100;
                  const y = 130 - h;
                  return (
                    <g key={att.id}>
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={Math.max(4, h)}
                        rx="4"
                        fill={att.completedFlight ? '#047857' : '#d97706'}
                      />
                      <text
                        x={x + barW / 2}
                        y="148"
                        textAnchor="middle"
                        fontSize="10"
                        fill="#44403c"
                      >
                        P{idx + 1}
                      </text>
                      <text
                        x={x + barW / 2}
                        y={Math.max(14, y - 5)}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill="#1c1917"
                      >
                        {att.firstTryAccuracyPct}%
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="flex items-center gap-4 text-[11px] text-stone-600 mt-1">
                <span>Hijau: Berjaya menamatkan laluan</span>
                <span>·</span>
                <span>Kuning: Percubaan separuh jalan</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
