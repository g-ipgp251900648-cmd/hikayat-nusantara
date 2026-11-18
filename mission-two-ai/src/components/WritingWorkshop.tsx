import React, { useMemo, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  HelpCircle,
  PlusCircle,
  RotateCcw,
  Save,
  ScrollText,
  Sparkles,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  CHECKPOINTS,
  EXAMPLE_STORY_TEXT,
  LATAR_OPTIONS,
  PERISTIWA_OPTIONS,
  SELF_CHECKLIST_ITEMS,
  TEMPLATE_STARTERS,
  WATAK_OPTIONS,
} from '../game/data';
import type {
  GamePhase,
  SelfChecklistState,
  StoryDraft,
  WritingSectionKey,
} from '../game/types';
import {
  evaluateDraftCompleteness,
  getUsedPhrasesInDraft,
  insertPhraseAtCursor,
  isChecklistComplete,
} from '../game/writing';

type WorkshopTab =
  | 'watak'
  | 'latar'
  | 'peristiwa'
  | 'tulis'
  | 'semak'
  | 'pratonton';

interface WritingWorkshopProps {
  phase: GamePhase;
  collectedPhrases: string[];
  draft: StoryDraft;
  checklist: SelfChecklistState;
  storageAvailable: boolean;
  xpAwarded: number;
  missionCompleted: boolean;
  onEnterWorkshopFromArrival: () => void;
  onUpdateDraft: (updater: (prev: StoryDraft) => StoryDraft) => void;
  onUpdateChecklist: (key: keyof SelfChecklistState, checked: boolean) => void;
  onManualSaveDraft: () => boolean;
  onMarkReviewed: () => void;
  onCompleteMission: () => void;
  onReplayFlight: () => void;
  onOpenAssessment: () => void;
  onReturnToGarden: () => void;
}

const SECTION_ORDER: WritingSectionKey[] = [
  'permulaan',
  'perkembangan',
  'pengakhiran',
];

const SECTION_LABELS: Record<WritingSectionKey, string> = {
  permulaan: 'Bahagian 1: Permulaan',
  perkembangan: 'Bahagian 2: Perkembangan',
  pengakhiran: 'Bahagian 3: Pengakhiran',
};

export const WritingWorkshop: React.FC<WritingWorkshopProps> = ({
  phase,
  collectedPhrases,
  draft,
  checklist,
  storageAvailable,
  xpAwarded,
  missionCompleted,
  onEnterWorkshopFromArrival,
  onUpdateDraft,
  onUpdateChecklist,
  onManualSaveDraft,
  onMarkReviewed,
  onCompleteMission,
  onReplayFlight,
  onOpenAssessment,
  onReturnToGarden,
}) => {
  const [activeTab, setActiveTab] = useState<WorkshopTab>('watak');
  const [activeSection, setActiveSection] = useState<WritingSectionKey>('permulaan');
  const [showExampleModal, setShowExampleModal] = useState(false);
  const [highlightExamplePhrases, setHighlightExamplePhrases] = useState(true);
  const [hangTuahTipOpen, setHangTuahTipOpen] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);
  const [hasCheckedCompleteness, setHasCheckedCompleteness] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cursorRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const usedPhrases = useMemo(() => getUsedPhrasesInDraft(draft), [draft]);
  const completeness = useMemo(() => evaluateDraftCompleteness(draft), [draft]);
  const checklistReady = useMemo(() => isChecklistComplete(checklist), [checklist]);

  const selectedWatak = WATAK_OPTIONS.find((w) => w.id === draft.watakId);
  const selectedLatar = LATAR_OPTIONS.find((l) => l.id === draft.latarId);
  const selectedPeristiwa = PERISTIWA_OPTIONS.find((p) => p.id === draft.peristiwaId);

  const syncCursorFromTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    cursorRef.current = {
      start: el.selectionStart ?? el.value.length,
      end: el.selectionEnd ?? el.value.length,
    };
  };

  const handleInsertPhrase = (phrase: string) => {
    if (activeTab !== 'tulis') {
      setActiveTab('tulis');
    }
    const currentText = draft[activeSection];
    const el = textareaRef.current;
    const start = el ? el.selectionStart ?? currentText.length : cursorRef.current.start;
    const end = el ? el.selectionEnd ?? currentText.length : cursorRef.current.end;

    const { nextText, nextCursorPos } = insertPhraseAtCursor(
      currentText,
      start,
      end,
      phrase,
    );

    onUpdateDraft((prev) => ({
      ...prev,
      [activeSection]: nextText,
    }));

    window.requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCursorPos, nextCursorPos);
        cursorRef.current = { start: nextCursorPos, end: nextCursorPos };
      }
    });
  };

  const handleCopyPhrase = async (phrase: string) => {
    try {
      await navigator.clipboard?.writeText(phrase);
      setCopiedPhrase(phrase);
      window.setTimeout(() => setCopiedPhrase(null), 1600);
    } catch {
      setCopiedPhrase(phrase);
      window.setTimeout(() => setCopiedPhrase(null), 1600);
    }
  };

  const handleApplyTemplateToggle = (useTpl: boolean) => {
    onUpdateDraft((prev) => {
      const next = { ...prev, useTemplate: useTpl };
      if (useTpl) {
        if (!prev.permulaan.trim()) next.permulaan = TEMPLATE_STARTERS.permulaan;
        if (!prev.perkembangan.trim()) next.perkembangan = TEMPLATE_STARTERS.perkembangan;
        if (!prev.pengakhiran.trim()) next.pengakhiran = TEMPLATE_STARTERS.pengakhiran;
      }
      return next;
    });
  };

  const handleManualSave = () => {
    const ok = onManualSaveDraft();
    setSaveFeedback(
      ok
        ? 'Draf cerita berjaya disimpan secara setempat.'
        : 'Storan pelayar tidak tersedia — draf anda mungkin tidak disimpan selepas halaman ditutup.',
    );
    window.setTimeout(() => setSaveFeedback(null), 3500);
  };

  const getContextCoachMessage = () => {
    if (activeTab === 'watak') {
      return 'Pilih watak utama yang kamu suka! Fikirkan sifat murni watak tersebut seperti Melur atau Hang Tuah.';
    }
    if (activeTab === 'latar') {
      return 'Pilih suasana tempat berlakunya kisah kamu supaya pembaca dapat membayangkannya dengan jelas.';
    }
    if (activeTab === 'peristiwa') {
      return 'Peristiwa penting menjadi nadi cerita. Pilih satu cabaran atau penemuan yang menarik!';
    }
    if (activeSection === 'permulaan') {
      return 'Pada bahagian Permulaan, perkenalkan watak utama, waktu (contoh: pada suatu petang) dan latar tempat. Kamu boleh memasukkan ungkapan "sinar keemasan menyelimuti desa" atau "desa yang permai".';
    }
    if (activeSection === 'perkembangan') {
      return 'Pada bahagian Perkembangan, ceritakan masalah atau peristiwa penting yang berlaku serta tindakan watak menanganinya. Cuba gunakan ungkapan "hembusan bayu menyapa dedaunan" atau "hati yang tulus".';
    }
    return 'Pada bahagian Pengakhiran, terangkan bagaimana masalah diselesaikan dan pengajaran murni yang diperoleh watak. Ungkapan "cahaya harapan" sangat sesuai digunakan di sini!';
  };

  const renderHighlightedText = (text: string) => {
    const phrases = CHECKPOINTS.map((c) => c.phrase);
    const regex = new RegExp(`(${phrases.join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => {
      const matched = phrases.some((p) => p.toLowerCase() === part.toLowerCase());
      if (matched) {
        return (
          <mark
            key={i}
            className="bg-amber-200/80 text-emerald-950 font-semibold px-1 rounded"
          >
            {part}
          </mark>
        );
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  };

  // Phase 1: Balai Olah Hikayat Arrival Screen
  if (phase === 'balai_arrival') {
    return (
      <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center p-4 pointer-events-none">
        <div className="parchment-surface rounded-2xl max-w-2xl w-full p-6 sm:p-8 text-stone-900 pointer-events-auto">
          <div className="text-xs font-semibold text-emerald-800 mb-1">
            Balai Olah Hikayat · Bengkel Penulisan Dibuka
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-emerald-950 mb-3">
            Selamat Tiba di Balai Olah Hikayat
          </h2>
          <p className="text-sm sm:text-base text-stone-700 leading-relaxed mb-4">
            Kelima-lima gulungan naskhah daripada Bank Kata Warisan telah bergerak menyinari{' '}
            <strong className="text-emerald-900">Kitab Hikayat Baharu</strong> di atas meja kayu berukir.
          </p>
          <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 mb-5 text-sm text-stone-800">
            <span className="font-semibold text-emerald-900">Hang Tuah berkata: </span>
            “Syabas, pengembara muda! Kamu telah berjaya mengumpulkan lima ungkapan indah. Namun, tugas kita belum selesai. Kini tiba masanya untuk menggunakan sekurang-kurangnya dua ungkapan tersebut dalam hikayat ciptaanmu!”
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-stone-600">
              Ungkapan terkumpul: <strong className="text-emerald-900">{collectedPhrases.length}/5</strong>
            </div>
            <button
              type="button"
              onClick={onEnterWorkshopFromArrival}
              className="px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-amber-50 font-semibold text-sm flex items-center gap-2 cursor-pointer"
            >
              <span>Mulakan Bengkel Penulisan</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Phase 2: Victory Celebration Screen
  if (phase === 'victory') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-label="Kemenangan Misi 2"
          className="parchment-surface rounded-2xl max-w-2xl w-full p-6 sm:p-8 text-stone-900 pointer-events-auto max-h-[92vh] overflow-y-auto"
        >
          <div className="flex items-center justify-center gap-2 text-amber-700 font-semibold text-xs tracking-wider uppercase mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Kitab Hikayat Baharu Bercahaya</span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center text-emerald-950 mb-3">
            TAHNIAH, PENGEMBARA MUDA! MISI 2 BERJAYA DISELESAIKAN!
          </h2>

          <div className="rounded-xl bg-emerald-900 text-amber-50 p-4 mb-5 text-sm leading-relaxed">
            <span className="font-semibold text-amber-300">Ucapan Hang Tuah: </span>
            “Hebat sungguh hasil usahamu! Kamu bukan sahaja berjaya menerbangkan Wau Sakti, malah telah menggunakan keindahan bahasa untuk mencipta sebuah hikayat baharu. Teruskan mengangkat warisan bahasa kita!”
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl bg-amber-100/90 border border-amber-300 p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center font-mono-num font-bold text-lg shrink-0">
                +{xpAwarded}
              </div>
              <div>
                <div className="text-xs text-amber-900 font-medium">Ganjaran Pengalaman</div>
                <div className="font-display text-lg font-bold text-stone-900">
                  {xpAwarded} XP (Kemajuan ke Misi 3)
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-emerald-800 font-medium">Lencana Dibuka</div>
                <div className="font-display text-base font-bold text-emerald-950">
                  Pengolah Hikayat Gemilang
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-stone-600 text-center mb-5">
            Kemajuan latihan setempat direkodkan untuk Misi 2. Sijil akhir keseluruhan hanya dikeluarkan selepas melengkapkan misi seterusnya dan semakan guru.
          </p>

          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('pratonton');
                onEnterWorkshopFromArrival();
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-amber-50 text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              Lihat Karya Saya
            </button>
            <button
              type="button"
              onClick={onReplayFlight}
              className="px-4 py-2.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-sm font-medium flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Ulang Penerbangan
            </button>
            <button
              type="button"
              onClick={onOpenAssessment}
              className="px-4 py-2.5 rounded-xl bg-amber-100 border border-amber-300 hover:bg-amber-200 text-amber-950 text-sm font-medium flex items-center gap-2 cursor-pointer"
            >
              <BarChart3 className="w-4 h-4" />
              Rekod Percubaan
            </button>
            <button
              type="button"
              onClick={onReturnToGarden}
              className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-amber-50 text-sm font-medium cursor-pointer"
            >
              Kembali ke Desa Hikayat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Open-Book Writing Workshop inside Balai Olah Hikayat
  const navSteps: { id: WorkshopTab; label: string; done: boolean }[] = [
    { id: 'watak', label: 'Pilih Watak', done: Boolean(draft.watakId) },
    { id: 'latar', label: 'Pilih Latar', done: Boolean(draft.latarId) },
    { id: 'peristiwa', label: 'Pilih Peristiwa', done: Boolean(draft.peristiwaId) },
    {
      id: 'tulis',
      label: 'Tulis Hikayat',
      done:
        completeness.checks.hasPermulaan &&
        completeness.checks.hasPerkembangan &&
        completeness.checks.hasPengakhiran &&
        completeness.checks.hasMinPhrases,
    },
    { id: 'semak', label: 'Semak Karya', done: completeness.isComplete && checklistReady },
    { id: 'pratonton', label: 'Pratonton Hasil', done: missionCompleted },
  ];

  const sectionIdx = SECTION_ORDER.indexOf(activeSection);

  return (
    <div className="fixed inset-0 z-20 flex flex-col p-2 sm:p-3 overflow-y-auto bg-stone-950/55">
      <div className="max-w-7xl w-full mx-auto timber-surface rounded-2xl p-2.5 sm:p-3.5 text-stone-900">
        {/* Top Workshop Header & Progress Stepper */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-amber-50 pr-48 sm:pr-56">
          <div>
            <div className="text-[11px] text-amber-300 font-medium">
              Balai Olah Hikayat · Bengkel Pengolahan Cerita Kreatif
            </div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-amber-50 leading-tight">
              Kitab Hikayat Baharu
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowExampleModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-100 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Lihat Contoh Hikayat
            </button>
            <button
              type="button"
              onClick={() => setHangTuahTipOpen((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Minta Petunjuk Hang Tuah
            </button>
            <button
              type="button"
              onClick={handleManualSave}
              className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              Simpan Draf
            </button>
          </div>
        </div>

        {/* Navigation Progress Stepper */}
        <nav
          aria-label="Langkah Bengkel Penulisan"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 mb-2"
        >
          {navSteps.map((step, i) => {
            const active = activeTab === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveTab(step.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between gap-2 border transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-amber-100 text-emerald-950 border-amber-300 font-semibold'
                    : 'bg-stone-900/70 text-amber-100/85 border-amber-700/40 hover:bg-stone-800'
                }`}
              >
                <span className="truncate">
                  {i + 1}. {step.label}
                </span>
                {step.done && (
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      active ? 'text-emerald-700' : 'text-emerald-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Honest Storage & Save Feedback Banner */}
        {(!storageAvailable || saveFeedback) && (
          <div className="mb-3 rounded-lg bg-amber-100 border border-amber-300 px-3.5 py-2 text-xs text-amber-950">
            {saveFeedback ||
              'Perhatian: Storan setempat pelayar tidak tersedia. Draf penulisan mungkin tidak kekal selepas halaman ditutup.'}
          </div>
        )}

        {/* Context-Aware Hang Tuah Coach Drawer */}
        {hangTuahTipOpen && (
          <div className="mb-3 rounded-xl bg-emerald-950 border border-amber-400/50 px-4 py-3 text-amber-50 text-xs sm:text-sm flex items-start justify-between gap-3">
            <div>
              <span className="font-semibold text-amber-300">Petunjuk Hang Tuah: </span>
              {getContextCoachMessage()}
            </div>
            <button
              type="button"
              onClick={() => setHangTuahTipOpen(false)}
              className="text-amber-200 hover:text-white text-xs underline shrink-0 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Open-Book Two-Page Spread */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
          {/* LEFT PAGE: Bank Kata Indah */}
          <aside className="lg:col-span-4 parchment-surface rounded-xl p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <h2 className="font-display text-base sm:text-lg font-bold text-emerald-950 flex items-center gap-1.5">
                  <ScrollText className="w-4 h-4 text-amber-700" />
                  Bank Kata Indah
                </h2>
                <span
                  data-testid="phrase-counter"
                  className={`font-mono-num text-xs font-bold px-2 py-0.5 rounded-md border ${
                    usedPhrases.length >= 2
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  Ungkapan Indah: {usedPhrases.length}/2
                </span>
              </div>

              <p className="text-[11px] text-stone-600 mb-2 leading-snug">
                Gunakan sekurang-kurangnya <strong>2 ungkapan indah</strong> dalam penulisan kamu. Penghitung dikemas kini secara automatik berdasarkan teks sebenar yang ditulis.
              </p>

              <div className="space-y-1.5">
                {CHECKPOINTS.map((cp) => {
                  const isUsed = usedPhrases.includes(cp.phrase);
                  return (
                    <div
                      key={cp.index}
                      className={`rounded-lg p-2.5 border transition-colors ${
                        isUsed
                          ? 'bg-emerald-50/90 border-emerald-500'
                          : 'bg-white/85 border-amber-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <div className="font-display font-bold text-sm text-emerald-950 leading-tight">
                          “{cp.phrase}”
                        </div>
                        <span
                          className={`text-[11px] font-semibold shrink-0 ${
                            isUsed ? 'text-emerald-700' : 'text-stone-500'
                          }`}
                        >
                          {isUsed ? 'Digunakan' : 'Belum'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-700 mb-1.5 leading-snug">
                        {cp.phraseMeaning}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleInsertPhrase(cp.phrase)}
                          className="px-2 py-1 rounded-md bg-emerald-800 hover:bg-emerald-900 text-amber-50 text-[11px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <PlusCircle className="w-3 h-3" />
                          Masukkan pada Kursor
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyPhrase(cp.phrase)}
                          className="px-2 py-1 rounded-md bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          {copiedPhrase === cp.phrase ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-700" />
                              Disalin
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Salin
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-amber-300/70 flex items-center justify-between text-xs text-stone-700">
              <span>Perkataan Ditulis:</span>
              <span className="font-mono-num font-bold">{completeness.wordCount} patah kata</span>
            </div>
          </aside>

          {/* RIGHT PAGE: Interactive Writing / Selection / Review / Preview Canvas */}
          <section className="lg:col-span-8 parchment-surface rounded-xl p-3.5 sm:p-4 flex flex-col justify-between">
            {/* Step 1: Watak */}
            {activeTab === 'watak' && (
              <div className="animate-page-flip">
                <h2 className="font-display text-2xl font-bold text-emerald-950 mb-1">
                  Langkah 1: Pilih Watak Utama
                </h2>
                <p className="text-sm text-stone-600 mb-4">
                  Siapakah tokoh yang akan menerajui hikayat kreatif kamu?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  {WATAK_OPTIONS.map((w) => {
                    const selected = draft.watakId === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => onUpdateDraft((prev) => ({ ...prev, watakId: w.id }))}
                        className={`text-left rounded-xl p-4 border-2 transition-colors cursor-pointer ${
                          selected
                            ? 'bg-emerald-50 border-emerald-700'
                            : 'bg-white/85 border-stone-200 hover:border-amber-500'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-display font-bold text-lg shrink-0"
                              style={{ backgroundColor: w.accentColor }}
                            >
                              {w.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-display font-bold text-base text-stone-900">
                                {w.name}
                              </div>
                              <div className="text-xs text-stone-600">{w.role}</div>
                            </div>
                          </div>
                          {selected && <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />}
                        </div>
                        <p className="text-xs text-stone-700 leading-relaxed">{w.traits}</p>
                        <div className="mt-2 text-[11px] font-semibold text-amber-800">
                          Sifat Utama: {w.badgeText}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Latar */}
            {activeTab === 'latar' && (
              <div className="animate-page-flip">
                <h2 className="font-display text-2xl font-bold text-emerald-950 mb-1">
                  Langkah 2: Pilih Latar Cerita
                </h2>
                <p className="text-sm text-stone-600 mb-4">
                  Pilih tempat dan suasana yang menjadi latar pengembaraan watak kamu.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                  {LATAR_OPTIONS.map((l) => {
                    const selected = draft.latarId === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => onUpdateDraft((prev) => ({ ...prev, latarId: l.id }))}
                        className={`text-left rounded-xl overflow-hidden border-2 transition-colors cursor-pointer ${
                          selected
                            ? 'bg-emerald-50 border-emerald-700'
                            : 'bg-white/85 border-stone-200 hover:border-amber-500'
                        }`}
                      >
                        <div
                          className="h-14 w-full flex items-end p-2.5"
                          style={{
                            background: `linear-gradient(135deg, ${l.palette[0]}, ${l.palette[1]})`,
                          }}
                        >
                          <span className="text-xs font-bold text-white drop-shadow">
                            {l.name}
                          </span>
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-stone-700 leading-snug mb-1.5">
                            {l.description}
                          </p>
                          <div className="text-[11px] font-medium text-emerald-800">
                            Suasana: {l.atmosphere}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Peristiwa */}
            {activeTab === 'peristiwa' && (
              <div className="animate-page-flip">
                <h2 className="font-display text-2xl font-bold text-emerald-950 mb-1">
                  Langkah 3: Pilih Peristiwa Utama
                </h2>
                <p className="text-sm text-stone-600 mb-4">
                  Apakah kejadian penting yang berlaku dalam cerita kamu?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  {PERISTIWA_OPTIONS.map((p) => {
                    const selected = draft.peristiwaId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onUpdateDraft((prev) => ({ ...prev, peristiwaId: p.id }))}
                        className={`text-left rounded-xl p-4 border-2 transition-colors cursor-pointer ${
                          selected
                            ? 'bg-emerald-50 border-emerald-700'
                            : 'bg-white/85 border-stone-200 hover:border-amber-500'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h3 className="font-display font-bold text-base text-stone-900">
                            {p.title}
                          </h3>
                          {selected && <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />}
                        </div>
                        <p className="text-xs text-stone-700 mb-2 leading-relaxed">{p.summary}</p>
                        <div className="text-[11px] text-amber-900 font-medium">
                          Panduan: {p.guidingPrompt}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Editor Penulisan 3 Bahagian */}
            {activeTab === 'tulis' && (
              <div key={activeSection} className="animate-page-flip flex-1 flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-emerald-950">
                      {SECTION_LABELS[activeSection]}
                    </h2>
                    <p className="text-xs text-stone-600">
                      Watak: <strong>{selectedWatak?.name || 'Belum dipilih'}</strong> · Latar:{' '}
                      <strong>{selectedLatar?.name || 'Belum dipilih'}</strong> · Peristiwa:{' '}
                      <strong>{selectedPeristiwa?.title || 'Belum dipilih'}</strong>
                    </p>
                  </div>

                  {/* Guided Template vs Free Writing toggle */}
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-amber-100 border border-amber-300">
                    <button
                      type="button"
                      onClick={() => handleApplyTemplateToggle(true)}
                      className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer whitespace-nowrap ${
                        draft.useTemplate
                          ? 'bg-emerald-800 text-white'
                          : 'text-stone-700 hover:text-stone-950'
                      }`}
                    >
                      Templat Separa Berpandu
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplateToggle(false)}
                      className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer whitespace-nowrap ${
                        !draft.useTemplate
                          ? 'bg-emerald-800 text-white'
                          : 'text-stone-700 hover:text-stone-950'
                      }`}
                    >
                      Menulis Bebas
                    </button>
                  </div>
                </div>

                {/* 3-Part Section Tabs */}
                <div className="flex items-center gap-1.5 mb-3">
                  {SECTION_ORDER.map((sec, idx) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setActiveSection(sec)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer whitespace-nowrap ${
                        activeSection === sec
                          ? 'bg-emerald-800 text-amber-50 border-emerald-900'
                          : 'bg-white/75 text-stone-700 border-stone-300 hover:bg-white'
                      }`}
                    >
                      {idx + 1}. {sec.charAt(0).toUpperCase() + sec.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="mb-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-stone-700">
                  {activeSection === 'permulaan' && (
                    <span>
                      <strong>Panduan Permulaan:</strong> Perkenalkan watak utama dan latar tempat. Contoh permulaan: <em>{TEMPLATE_STARTERS.permulaan}</em>
                    </span>
                  )}
                  {activeSection === 'perkembangan' && (
                    <span>
                      <strong>Panduan Perkembangan:</strong> Ceritakan peristiwa atau cabaran yang berlaku serta tindakan watak. Contoh: <em>{TEMPLATE_STARTERS.perkembangan}</em>
                    </span>
                  )}
                  {activeSection === 'pengakhiran' && (
                    <span>
                      <strong>Panduan Pengakhiran:</strong> Terangkan penyelesaian masalah dan pengajaran murni. Contoh: <em>{TEMPLATE_STARTERS.pengakhiran}</em>
                    </span>
                  )}
                </div>

                <label htmlFor="hikayat-editor-textarea" className="sr-only">
                  Ruang Menulis {SECTION_LABELS[activeSection]}
                </label>
                <textarea
                  id="hikayat-editor-textarea"
                  ref={textareaRef}
                  rows={5}
                  value={draft[activeSection]}
                  onChange={(e) => {
                    const val = e.target.value;
                    syncCursorFromTextarea();
                    onUpdateDraft((prev) => ({
                      ...prev,
                      [activeSection]: val,
                    }));
                  }}
                  onClick={syncCursorFromTextarea}
                  onKeyUp={syncCursorFromTextarea}
                  onSelect={syncCursorFromTextarea}
                  placeholder={`Taip bahagian ${activeSection} hikayat kamu di sini. Klik kad di Bank Kata Indah untuk memasukkan ungkapan pada kedudukan kursor...`}
                  className="w-full flex-1 min-h-[145px] rounded-xl bg-white/95 border-2 border-amber-300 focus:border-emerald-700 focus:outline-none p-3 text-sm sm:text-base text-stone-900 leading-relaxed resize-y"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={sectionIdx === 0}
                      onClick={() => setActiveSection(SECTION_ORDER[sectionIdx - 1])}
                      className="px-3.5 py-2 rounded-lg bg-white border border-stone-300 text-stone-800 text-xs font-medium disabled:opacity-40 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      disabled={sectionIdx === SECTION_ORDER.length - 1}
                      onClick={() => setActiveSection(SECTION_ORDER[sectionIdx + 1])}
                      className="px-3.5 py-2 rounded-lg bg-white border border-stone-300 text-stone-800 text-xs font-medium disabled:opacity-40 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Seterusnya
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setHasCheckedCompleteness(true);
                      onMarkReviewed();
                      setActiveTab('semak');
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-amber-50 text-xs font-semibold cursor-pointer"
                  >
                    Semak Karya Saya
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Semakan Kelengkapan Asas & Senarai Semak Kendiri */}
            {activeTab === 'semak' && (
              <div className="animate-page-flip space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-emerald-950">
                      Semak Karya &amp; Penilaian Kendiri
                    </h2>
                    <p className="text-xs text-stone-600">
                      Semakan Kelengkapan Asas — editor kekal terbuka supaya kamu boleh memperbaiki draf pada bila-bila masa.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHasCheckedCompleteness(true);
                      onMarkReviewed();
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-amber-50 text-xs font-semibold cursor-pointer"
                  >
                    Semak Karya Saya
                  </button>
                </div>

                {/* Automated Basic Completeness Summary */}
                <div className="rounded-xl bg-white/90 border border-amber-300 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-sm font-bold text-stone-900">
                      Status Semakan Kelengkapan Asas
                    </span>
                    <span className="text-xs font-mono-num text-stone-700">
                      {completeness.wordCount} patah kata · {usedPhrases.length}/2 ungkapan minimum
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
                    {[
                      { label: 'Watak, Latar & Peristiwa', ok: completeness.checks.hasWatak && completeness.checks.hasLatar && completeness.checks.hasPeristiwa },
                      { label: 'Permulaan', ok: completeness.checks.hasPermulaan },
                      { label: 'Perkembangan', ok: completeness.checks.hasPerkembangan },
                      { label: 'Pengakhiran & 2+ Ungkapan', ok: completeness.checks.hasPengakhiran && completeness.checks.hasMinPhrases },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`p-2 rounded-lg border font-medium ${
                          item.ok
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                            : 'bg-amber-50 border-amber-300 text-amber-950'
                        }`}
                      >
                        {item.ok ? 'Lengkap: ' : 'Perlu dibaiki: '}
                        {item.label}
                      </div>
                    ))}
                  </div>

                  {completeness.isComplete ? (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-3 text-xs text-emerald-950 leading-relaxed">
                      <strong>Karya lengkap untuk semakan kendiri!</strong> Sila baca semula cerita kamu dan tandakan senarai semak di bawah. Nota: Semakan ini menilai kelengkapan struktur asas sahaja; mutu kreativiti, keindahan bahasa dan kesantunan keseluruhan memerlukan penilaian guru.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {(hasCheckedCompleteness || completeness.feedbackMessages.length > 0) &&
                        completeness.feedbackMessages.map((msg, i) => (
                          <div
                            key={i}
                            className="rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 text-xs text-amber-950"
                          >
                            {msg}
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveTab('tulis')}
                      className="px-3.5 py-2 rounded-lg bg-white border border-stone-300 text-stone-800 text-xs font-medium flex items-center gap-1.5 hover:bg-stone-50 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Semula Hikayat
                    </button>
                  </div>
                </div>

                {/* Interactive Student Self-Checklist Book */}
                <div className="rounded-xl bg-white/90 border border-amber-300 p-4">
                  <h3 className="font-display text-lg font-bold text-emerald-950 mb-1">
                    Buku Senarai Semak Kendiri Murid
                  </h3>
                  <p className="text-xs text-stone-600 mb-3">
                    Tandakan setiap perkara selepas kamu menyemak hasil penulisan sendiri:
                  </p>
                  <div className="space-y-2">
                    {SELF_CHECKLIST_ITEMS.map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-amber-50/70 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checklist[item.key]}
                          onChange={(e) => onUpdateChecklist(item.key, e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-emerald-700 shrink-0"
                        />
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-stone-900">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-stone-600">{item.helper}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Pratonton Kitab Hikayat Baharu */}
            {activeTab === 'pratonton' && (
              <div className="animate-page-flip space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-emerald-950">
                      Pratonton Kitab Hikayat Baharu
                    </h2>
                    <p className="text-xs text-stone-600">
                      Paparan karya sebenar ciptaan kamu bersama ungkapan indah yang diserlahkan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tulis')}
                    className="px-3.5 py-2 rounded-lg bg-white border border-stone-300 text-stone-800 text-xs font-medium flex items-center gap-1.5 hover:bg-stone-50 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Semula
                  </button>
                </div>

                <div className="rounded-xl bg-amber-50/90 border-2 border-amber-400 p-5 space-y-3">
                  <div className="text-center border-b border-amber-300 pb-3">
                    <div className="text-xs font-semibold text-amber-800">
                      Karya Kreatif Misi 2 · {selectedLatar?.name || 'Latar Pilihan'}
                    </div>
                    <h3 className="font-display text-xl font-bold text-emerald-950">
                      Kisah {selectedWatak?.name || 'Watak Utama'}: {selectedPeristiwa?.title || 'Hikayat Baharu'}
                    </h3>
                  </div>

                  <div className="space-y-3 text-sm sm:text-base text-stone-800 leading-relaxed">
                    <p>
                      {draft.permulaan.trim()
                        ? renderHighlightedText(draft.permulaan)
                        : <span className="italic text-stone-400">(Bahagian permulaan belum ditulis)</span>}
                    </p>
                    <p>
                      {draft.perkembangan.trim()
                        ? renderHighlightedText(draft.perkembangan)
                        : <span className="italic text-stone-400">(Bahagian perkembangan belum ditulis)</span>}
                    </p>
                    <p>
                      {draft.pengakhiran.trim()
                        ? renderHighlightedText(draft.pengakhiran)
                        : <span className="italic text-stone-400">(Bahagian pengakhiran belum ditulis)</span>}
                    </p>
                  </div>
                </div>

                {!completeness.isComplete || !checklistReady ? (
                  <div className="rounded-xl bg-amber-100 border border-amber-300 p-3.5 text-xs text-amber-950">
                    Untuk menekan butang <strong>Selesaikan Misi</strong>, pastikan kelengkapan asas cerita dipenuhi dan kesemua 7 item dalam <strong>Senarai Semak Kendiri</strong> telah ditandakan.
                  </div>
                ) : (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-3.5 text-xs text-emerald-950">
                    Semua syarat asas dan semakan kendiri telah lengkap! Baca semula karya kamu sekali lagi sebelum mengesahkan penyelesaian Misi 2.
                  </div>
                )}
              </div>
            )}

            {/* Bottom Step Footer Actions */}
            <div className="mt-3 pt-2.5 border-t border-amber-300/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {activeTab !== 'watak' && (
                  <button
                    type="button"
                    onClick={() => {
                      const idx = navSteps.findIndex((s) => s.id === activeTab);
                      if (idx > 0) setActiveTab(navSteps[idx - 1].id);
                    }}
                    className="px-4 py-2 rounded-lg bg-white border border-stone-300 text-stone-800 text-xs font-medium hover:bg-stone-50 cursor-pointer"
                  >
                    Langkah Sebelumnya
                  </button>
                )}
                {activeTab !== 'pratonton' && (
                  <button
                    type="button"
                    onClick={() => {
                      const idx = navSteps.findIndex((s) => s.id === activeTab);
                      if (idx < navSteps.length - 1) setActiveTab(navSteps[idx + 1].id);
                    }}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Langkah Seterusnya
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('pratonton')}
                  className="px-4 py-2 rounded-lg bg-white border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Pratonton Buku
                </button>
                <button
                  type="button"
                  disabled={!completeness.isComplete || !checklistReady}
                  onClick={onCompleteMission}
                  className="px-5 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-400 text-amber-50 text-xs sm:text-sm font-semibold cursor-pointer disabled:cursor-not-allowed"
                >
                  Selesaikan Misi (+90 XP)
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Example Hikayat Digital Book Modal */}
      {showExampleModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-stone-950/70">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Contoh Hikayat Kreatif"
            className="parchment-surface rounded-2xl max-w-xl w-full p-6 text-stone-900"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-display text-2xl font-bold text-emerald-950">
                Contoh Hikayat Kreatif
              </h3>
              <button
                type="button"
                onClick={() => setShowExampleModal(false)}
                className="px-3 py-1 rounded-md bg-stone-200 hover:bg-stone-300 text-xs font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-emerald-900 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={highlightExamplePhrases}
                onChange={(e) => setHighlightExamplePhrases(e.target.checked)}
                className="w-4 h-4 accent-emerald-700"
              />
              Serlahkan lima ungkapan indah dalam contoh ini
            </label>

            <div className="rounded-xl bg-amber-50/90 border border-amber-300 p-4 text-sm sm:text-base leading-relaxed text-stone-800 mb-4">
              {highlightExamplePhrases
                ? renderHighlightedText(EXAMPLE_STORY_TEXT)
                : EXAMPLE_STORY_TEXT}
            </div>

            <p className="text-xs text-stone-600">
              Nota: Contoh ini hanyalah panduan gaya bahasa. Hasilkan cerita ciptaan kamu sendiri berdasarkan watak, latar dan peristiwa pilihanmu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
