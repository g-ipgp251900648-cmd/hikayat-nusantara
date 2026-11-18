import type {
  CheckpointDefinition,
  DifficultyConfig,
  DifficultyMode,
  FlightZone,
  LatarOption,
  PeristiwaOption,
  SelfChecklistState,
  StoryDraft,
  WatakOption,
} from './types';

export const SKY_MIN_Y = 1.6;
export const SKY_MAX_Y = 11.4;
export const WAU_START_Y = 6.2;
export const FINAL_GATE_WORLD_X = 365;

export const DIFFICULTY_CONFIGS: Record<DifficultyMode, DifficultyConfig> = {
  latihan: {
    id: 'latihan',
    label: 'Mod Latihan',
    subtitle: 'Tanpa pemasa · Halangan perlahan · Laluan luas · Petunjuk bebas',
    hasTimer: false,
    timerSeconds: 0,
    maxHearts: 3,
    forwardSpeed: 4.3,
    gravity: 11.5,
    liftAccel: 24.5,
    maxVy: 6.2,
    gapSize: 5.1,
    obstacleInterval: 21,
    hintsUnlimited: true,
    showGuidanceRing: true,
  },
  pengembara: {
    id: 'pengembara',
    label: 'Mod Pengembara',
    subtitle: 'Pemasa 120 saat · 3 hati · Cabaran seimbang (Disyorkan Tahun 5)',
    recommended: true,
    hasTimer: true,
    timerSeconds: 120,
    maxHearts: 3,
    forwardSpeed: 5.2,
    gravity: 13.8,
    liftAccel: 28.5,
    maxVy: 7.0,
    gapSize: 4.3,
    obstacleInterval: 18,
    hintsUnlimited: false,
    showGuidanceRing: true,
  },
  pahlawan: {
    id: 'pahlawan',
    label: 'Mod Pahlawan',
    subtitle: 'Pemasa 120 saat · Angin lebih kencang · Variasi halangan tinggi',
    hasTimer: true,
    timerSeconds: 120,
    maxHearts: 3,
    forwardSpeed: 6.1,
    gravity: 15.2,
    liftAccel: 31.0,
    maxVy: 7.6,
    gapSize: 3.7,
    obstacleInterval: 15.5,
    hintsUnlimited: false,
    showGuidanceRing: false,
  },
};

export const FLIGHT_ZONES: FlightZone[] = [
  {
    id: 0,
    name: 'Langit Sinar Senja',
    subtitle: 'Sawah Padi Keemasan',
    startX: 0,
    endX: 72,
    skyTop: '#5698c6',
    skyBottom: '#f7c97e',
    fogColor: '#e8c996',
    sunColor: '#ffcb77',
    groundTint: '#6fa442',
    description: 'Penerbangan bermula di atas sawah padi yang disinari cahaya matahari petang keemasan.',
  },
  {
    id: 1,
    name: 'Desa Permai',
    subtitle: 'Perkampungan Melayu & Sungai',
    startX: 72,
    endX: 144,
    skyTop: '#4aa5d8',
    skyBottom: '#f9dfb0',
    fogColor: '#ebd9b5',
    sunColor: '#ffd588',
    groundTint: '#5a9949',
    description: 'Menyusuri perkampungan Melayu tradisional yang aman dengan sungai, jambatan kayu dan bunga raya.',
  },
  {
    id: 2,
    name: 'Lembah Bayu',
    subtitle: 'Bukit & Hutan Tropika',
    startX: 144,
    endX: 216,
    skyTop: '#3e8fc2',
    skyBottom: '#cce7d4',
    fogColor: '#cde2d6',
    sunColor: '#ffe3a8',
    groundTint: '#2f7a4d',
    description: 'Menembusi lembah berbukit dan hutan tropika yang ditiup hembusan bayu lembut.',
  },
  {
    id: 3,
    name: 'Taman Hati Tulus',
    subtitle: 'Taman Fantasi & Kunang-kunang',
    startX: 216,
    endX: 288,
    skyTop: '#4784b8',
    skyBottom: '#f6d6b8',
    fogColor: '#edd0bd',
    sunColor: '#ffd18b',
    groundTint: '#4f8f54',
    description: 'Taman indah berbungakan kenanga, rama-rama dan cahaya keemasan yang melambangkan keikhlasan.',
  },
  {
    id: 4,
    name: 'Puncak Cahaya Harapan',
    subtitle: 'Gerbang Balai Olah Hikayat',
    startX: 288,
    endX: 380,
    skyTop: '#3776b3',
    skyBottom: '#fde19a',
    fogColor: '#f3d8a3',
    sunColor: '#ffe082',
    groundTint: '#488848',
    description: 'Kawasan bukit tinggi yang menghadap Balai Olah Hikayat dengan cahaya senja keemasan.',
  },
];

export const CHECKPOINTS: CheckpointDefinition[] = [
  {
    index: 0,
    gateName: 'Gerbang Sinar Senja',
    zoneName: 'Langit Sinar Senja',
    worldX: 64,
    question: 'Ungkapan manakah yang paling indah untuk menggambarkan cahaya matahari pada waktu petang?',
    hint: 'Pilih ungkapan yang melukiskan warna cahaya petang dan kesannya menyelimuti kawasan kampung.',
    phrase: 'sinar keemasan menyelimuti desa',
    phraseMeaning: 'Cahaya matahari petang berwarna keemasan yang menerangi seluruh kampung dengan suasana damai.',
    phraseExample: 'Pada waktu petang, sinar keemasan menyelimuti desa yang tenang itu.',
    hangTuahExplanation:
      'Syabas! "Sinar keemasan menyelimuti desa" membantu pembaca membayangkan cahaya petang yang lembut dan indah berbanding ayat biasa.',
    options: [
      {
        id: 'cp1_a',
        text: 'Matahari ada di langit',
        isCorrect: false,
        feedback: 'Ayat ini betul dari segi fakta, tetapi terlalu ringkas dan kurang puitis untuk cerita hikayat. Cuba pilih ungkapan yang menggambarkan warna cahaya petang.',
      },
      {
        id: 'cp1_b',
        text: 'Sinar keemasan menyelimuti desa',
        isCorrect: true,
        feedback: 'Tepat sekali! Ungkapan ini melukiskan keindahan cahaya petang yang keemasan dengan sangat jelas.',
      },
      {
        id: 'cp1_c',
        text: 'Hari sudah petang',
        isCorrect: false,
        feedback: 'Ayat ini hanya menyatakan waktu tanpa menggambarkan keindahan cahaya matahari. Cuba pilih ungkapan yang lebih indah.',
      },
    ],
  },
  {
    index: 1,
    gateName: 'Gerbang Desa Permai',
    zoneName: 'Desa Permai',
    worldX: 132,
    question: 'Ungkapan manakah yang paling sesuai untuk menggambarkan sebuah kampung yang aman dan indah?',
    hint: 'Perkataan "permai" bermaksud elok, indah dan menenangkan perasaan.',
    phrase: 'desa yang permai',
    phraseMeaning: 'Kampung yang indah pemandangannya, aman suasananya dan menyenangkan hati penduduk.',
    phraseExample: 'Penduduk hidup harmoni dan saling membantu di desa yang permai itu.',
    hangTuahExplanation:
      'Bagus! Ungkapan "desa yang permai" menggambarkan suasana kampung yang indah, aman dan menyenangkan untuk didiami.',
    options: [
      {
        id: 'cp2_a',
        text: 'Kampung itu mempunyai rumah',
        isCorrect: false,
        feedback: 'Pilihan ini hanya menyebut benda yang ada di kampung, belum menggambarkan suasana aman dan indah.',
      },
      {
        id: 'cp2_b',
        text: 'Desa yang permai',
        isCorrect: true,
        feedback: 'Benar! "Desa yang permai" ialah ungkapan indah yang menggambarkan kampung yang aman dan cantik.',
      },
      {
        id: 'cp2_c',
        text: 'Tempat yang mempunyai jalan',
        isCorrect: false,
        feedback: 'Ayat ini terlalu umum dan tidak menunjukkan keindahan atau kedamaian sesebuah kampung.',
      },
    ],
  },
  {
    index: 2,
    gateName: 'Gerbang Bayu Lembut',
    zoneName: 'Lembah Bayu',
    worldX: 200,
    question: 'Ungkapan manakah yang paling menarik untuk menggambarkan angin yang bertiup perlahan?',
    hint: 'Cari kata sastera bagi angin lembut ("bayu") dan kesannya kepada daun pokok.',
    phrase: 'hembusan bayu menyapa dedaunan',
    phraseMeaning: 'Tiupan angin lembut yang menggerakkan daun-daun pokok dengan tenang dan sejuk.',
    phraseExample: 'Sewaktu berehat di bawah pokok kelapa, hembusan bayu menyapa dedaunan dengan lembut.',
    hangTuahExplanation:
      'Hebat! Ungkapan "hembusan bayu menyapa dedaunan" membantu pembaca merasai suasana angin lembut yang menggerakkan daun.',
    options: [
      {
        id: 'cp3_a',
        text: 'Angin bergerak di luar',
        isCorrect: false,
        feedback: 'Ayat ini menyatakan angin bergerak, tetapi belum menggunakan bahasa berunsur keindahan alam.',
      },
      {
        id: 'cp3_b',
        text: 'Udara berada di kawasan itu',
        isCorrect: false,
        feedback: 'Pilihan ini tidak menggambarkan angin yang bertiup perlahan atau kesannya pada alam.',
      },
      {
        id: 'cp3_c',
        text: 'Hembusan bayu menyapa dedaunan',
        isCorrect: true,
        feedback: 'Tepat! Ungkapan ini menjadikan gambaran tiupan angin lembut terasa hidup dalam cerita.',
      },
    ],
  },
  {
    index: 3,
    gateName: 'Gerbang Hati Tulus',
    zoneName: 'Taman Hati Tulus',
    worldX: 268,
    question: 'Ungkapan manakah yang sesuai untuk menggambarkan seseorang yang ikhlas membantu orang lain?',
    hint: 'Ingat kembali sikap Melur dan penduduk kampung dalam kisah Pelita Warisan pada Misi 1.',
    phrase: 'hati yang tulus',
    phraseMeaning: 'Perasaan yang suci, jujur dan ikhlas membantu tanpa mengharapkan balasan.',
    phraseExample: 'Dengan hati yang tulus, Melur menghulurkan bantuan kepada warga tua yang memerlukan.',
    hangTuahExplanation:
      'Syabas! "Hati yang tulus" mencerminkan sikap ikhlas seperti Melur dan penduduk kampung dalam kisah Pelita Warisan dari Misi 1.',
    options: [
      {
        id: 'cp4_a',
        text: 'Hati yang tulus',
        isCorrect: true,
        feedback: 'Tepat sekali! "Hati yang tulus" bermaksud ikhlas, jujur dan murni budi pekertinya.',
      },
      {
        id: 'cp4_b',
        text: 'Hati yang besar seperti batu',
        isCorrect: false,
        feedback: 'Bandingannya tidak sesuai kerana "seperti batu" biasanya dikaitkan dengan sifat keras, bukan keikhlasan.',
      },
      {
        id: 'cp4_c',
        text: 'Hati yang sedang berjalan',
        isCorrect: false,
        feedback: 'Ungkapan ini tidak membawa maksud keikhlasan atau niat murni membantu orang lain.',
      },
    ],
  },
  {
    index: 4,
    gateName: 'Gerbang Cahaya Harapan',
    zoneName: 'Puncak Cahaya Harapan',
    worldX: 336,
    question: 'Ungkapan manakah yang sesuai untuk menggambarkan sesuatu yang memberikan semangat ketika menghadapi kesukaran?',
    hint: 'Pilih ungkapan kiasan yang melambangkan sinar semangat dan keyakinan baharu.',
    phrase: 'cahaya harapan',
    phraseMeaning: 'Sesuatu yang menjadi sumber semangat, petunjuk atau keyakinan ketika menghadapi kesusahan.',
    phraseExample: 'Kerjasama penduduk kampung menjadi cahaya harapan untuk menyelamatkan naskhah pusaka.',
    hangTuahExplanation:
      'Cemerlang! "Cahaya harapan" digunakan secara kiasan untuk menggambarkan sesuatu yang memberikan semangat atau harapan baharu.',
    options: [
      {
        id: 'cp5_a',
        text: 'Lampu yang berada di meja',
        isCorrect: false,
        feedback: 'Ini merujuk kepada objek fizikal semata-mata, bukan kiasan untuk semangat ketika susah.',
      },
      {
        id: 'cp5_b',
        text: 'Cahaya harapan',
        isCorrect: true,
        feedback: 'Tepat! "Cahaya harapan" ialah ungkapan kiasan yang indah bagi semangat dan keyakinan.',
      },
      {
        id: 'cp5_c',
        text: 'Matahari yang mempunyai warna',
        isCorrect: false,
        feedback: 'Ungkapan ini terlalu literal dan tidak menggambarkan semangat ketika menghadapi kesukaran.',
      },
    ],
  },
];

export const WATAK_OPTIONS: WatakOption[] = [
  {
    id: 'melur',
    name: 'Melur',
    role: 'Gadis Desa Penyayang',
    traits: 'Prihatin, ikhlas dan pantas membantu penduduk kampung (seperti dalam Misi 1).',
    accentColor: '#059669',
    badgeText: 'Ikhlas & Prihatin',
  },
  {
    id: 'hang_tuah',
    name: 'Hang Tuah',
    role: 'Pahlawan & Pembimbing Hikayat',
    traits: 'Bijaksana, berani, santun berbahasa dan sentiasa menjaga warisan Melayu.',
    accentColor: '#b45309',
    badgeText: 'Bijaksana & Berani',
  },
  {
    id: 'tok_penghulu',
    name: 'Tok Penghulu',
    role: 'Ketua Kampung Berwibawa',
    traits: 'Tenang, penyabar dan dihormati kerana menyatukan warga desa.',
    accentColor: '#7c2d12',
    badgeText: 'Tenang & Adil',
  },
  {
    id: 'pengembara_muda',
    name: 'Pengembara Muda',
    role: 'Pewaris Bahasa Nusantara',
    traits: 'Bersemangat tinggi, suka meneroka ilmu dan tekun mencari khazanah bahasa.',
    accentColor: '#0284c7',
    badgeText: 'Tekun & Berani',
  },
];

export const LATAR_OPTIONS: LatarOption[] = [
  {
    id: 'desa_warisan',
    name: 'Desa Warisan',
    description: 'Perkampungan Melayu dengan rumah kayu berukir, halaman luas dan pokok kelapa.',
    atmosphere: 'Damai dan penuh semangat kejiranan.',
    palette: ['#065f46', '#d97706', '#fef3c7'],
  },
  {
    id: 'tepi_sungai',
    name: 'Tepi Sungai',
    description: 'Aliran sungai yang jernih berkilauan disinari cahaya petang bersama perahu kecil.',
    atmosphere: 'Tenang dengan deruan air lembut.',
    palette: ['#0369a1', '#38bdf8', '#e0f2fe'],
  },
  {
    id: 'jambatan_kayu',
    name: 'Jambatan Kayu',
    description: 'Jambatan kayu tradisional yang menghubungkan dua bahagian kampung di seberang sungai.',
    atmosphere: 'Nostalgik dan menjadi laluan utama penduduk.',
    palette: ['#78350f', '#b45309', '#fde68a'],
  },
  {
    id: 'sawah_padi',
    name: 'Sawah Padi',
    description: 'Bendang menghijau luas terbentang dengan pondok petani dan burung beterbangan.',
    atmosphere: 'Segar, luas dan disapa angin petang.',
    palette: ['#4d7c0f', '#84cc16', '#fef9c3'],
  },
  {
    id: 'taman_bunga',
    name: 'Taman Bunga',
    description: 'Taman bunga raya dan kenanga yang harum bersama rama-rama dan kunang-kunang.',
    atmosphere: 'Ceria, harum dan bercahaya lembut.',
    palette: ['#be123c', '#f59e0b', '#fce7f3'],
  },
  {
    id: 'balai_kampung',
    name: 'Balai Kampung',
    description: 'Balai kayu tempat penduduk berkumpul bermuafakat dan membaca naskhah pusaka.',
    atmosphere: 'Hangat diterangi pelita tembaga.',
    palette: ['#92400e', '#d97706', '#fef3c7'],
  },
];

export const PERISTIWA_OPTIONS: PeristiwaOption[] = [
  {
    id: 'pelita_pusaka',
    title: 'Menemukan Pelita Pusaka',
    summary: 'Menjumpai pelita tembaga lama yang menyimpan petunjuk sejarah kampung.',
    guidingPrompt: 'Ceritakan bagaimana watak menemukan pelita tersebut dan manfaatnya kepada kampung.',
  },
  {
    id: 'membantu_kabus',
    title: 'Membantu Penduduk Ketika Kabus',
    summary: 'Membantu warga tua dan penduduk melintasi laluan ketika kabus tebal melanda.',
    guidingPrompt: 'Ceritakan cabaran kabus serta tindakan berani watak membantu orang lain.',
  },
  {
    id: 'naskhah_warisan',
    title: 'Menyelamatkan Naskhah Warisan',
    summary: 'Melindungi kitab lama daripada rosak akibat hujan dan angin kencang.',
    guidingPrompt: 'Ceritakan bagaimana watak menjaga naskhah berharga itu dengan kerjasama penduduk.',
  },
  {
    id: 'rahsia_kampung',
    title: 'Mencari Rahsia Sebuah Kampung',
    summary: 'Menjejaki kisah silam di sebalik ukiran lama di balai atau jambatan kampung.',
    guidingPrompt: 'Ceritakan penemuan yang membawa kebaikan serta perpaduan kepada seluruh desa.',
  },
];

export const EXAMPLE_STORY_TEXT =
  'Pada suatu petang, sinar keemasan menyelimuti desa yang permai. Melur berjalan di tepi sungai sambil menikmati hembusan bayu menyapa dedaunan. Tiba-tiba, dia terdengar suara seorang warga tua meminta pertolongan. Dengan hati yang tulus, Melur bergegas membantu warga tersebut menyeberangi jambatan kayu. Keberaniannya menjadi cahaya harapan kepada penduduk kampung. Sejak hari itu, Melur semakin dihormati kerana sikapnya yang penyayang dan suka membantu.';

export const TEMPLATE_STARTERS = {
  permulaan:
    'Pada suatu petang, ______ sedang berjalan di ______ ketika ______.',
  perkembangan:
    'Tiba-tiba, ______. Watak utama mengambil keputusan untuk ______ kerana ______.',
  pengakhiran:
    'Akhirnya, ______. Sejak peristiwa itu, ______ menyedari bahawa ______.',
};

export const INITIAL_DRAFT: StoryDraft = {
  watakId: '',
  latarId: '',
  peristiwaId: '',
  useTemplate: true,
  permulaan: '',
  perkembangan: '',
  pengakhiran: '',
};

export const INITIAL_CHECKLIST: SelfChecklistState = {
  watakDanLatar: false,
  peristiwaJelas: false,
  permulaanLengkap: false,
  perkembanganLengkap: false,
  pengakhiranLengkap: false,
  duaUngkapanIndah: false,
  bacaSemulaSantun: false,
};

export const SELF_CHECKLIST_ITEMS: {
  key: keyof SelfChecklistState;
  label: string;
  helper: string;
}[] = [
  {
    key: 'watakDanLatar',
    label: 'Saya telah memilih watak utama dan latar cerita yang sesuai.',
    helper: 'Pastikan watak dan latar yang dipilih jelas kelihatan pada permulaan cerita.',
  },
  {
    key: 'peristiwaJelas',
    label: 'Saya telah memasukkan peristiwa penting yang menjadi teras hikayat.',
    helper: 'Peristiwa utama membantu cerita bergerak dengan menarik.',
  },
  {
    key: 'permulaanLengkap',
    label: 'Saya telah menulis bahagian permulaan dengan jelas.',
    helper: 'Memperkenalkan watak, masa dan tempat berlakunya cerita.',
  },
  {
    key: 'perkembanganLengkap',
    label: 'Saya telah menulis bahagian perkembangan dengan cabaran atau tindakan watak.',
    helper: 'Menunjukkan masalah dan usaha watak menanganinya.',
  },
  {
    key: 'pengakhiranLengkap',
    label: 'Saya telah menulis bahagian pengakhiran berserta penyelesaian dan pengajaran.',
    helper: 'Menutup cerita dengan nilai murni yang baik.',
  },
  {
    key: 'duaUngkapanIndah',
    label: 'Saya telah menggunakan sekurang-kurangnya dua ungkapan indah daripada Bank Kata.',
    helper: 'Ungkapan indah menjadikan ayat lebih puitis dan hidup.',
  },
  {
    key: 'bacaSemulaSantun',
    label: 'Saya telah membaca semula hikayat saya, menyemak bahasa santun dan membaiki bahagian kurang jelas.',
    helper: 'Semakan kendiri memastikan karya kemas dan mudah difahami pembaca.',
  },
];
