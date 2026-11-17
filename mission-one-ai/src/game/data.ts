export type ScrollId = 'rak' | 'peti' | 'tingkap' | 'meja' | 'pelita';

export interface ScrollStation {
  id: ScrollId;
  title: string;
  locationName: string;
  inspectPrompt: string;
  foundMessage: string;
  hint: string;
  // Interior coordinates in world space (Rumah Naskhah Pusaka center at x=0, z=0)
  worldPos: { x: number; y: number; z: number };
  approachPos: { x: number; z: number };
}

export interface StoryPage {
  pageNumber: number;
  title: string;
  text: string;
  imagePath: string;
  narrationText: string;
}

export interface SequenceEvent {
  id: string;
  correctIndex: number;
  title: string;
  summary: string;
  imagePath: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: { id: string; label: string }[];
  correctOptionId: string;
  wrongExplanation: string;
  hint: string;
}

export const SCROLL_STATIONS: ScrollStation[] = [
  {
    id: 'rak',
    title: 'Helaian Pertama: Penemuan di Tepi Sungai',
    locationName: 'Rak Kitab Lama',
    inspectPrompt: 'Periksa Rak Kitab Lama',
    foundMessage:
      'Syabas! Kamu menjumpai helaian pertama yang terselit di celah kitab-kitab lama.',
    hint: 'Cuba periksa rak kitab di sebelah kiri rumah. Mungkin ada cahaya emas di celah buku-buku lama.',
    worldPos: { x: -5.4, y: 1.5, z: -2.6 },
    approachPos: { x: -4.1, z: -2.6 },
  },
  {
    id: 'peti',
    title: 'Helaian Kedua: Nasihat Tok Penghulu',
    locationName: 'Peti Pusaka',
    inspectPrompt: 'Buka Peti Pusaka',
    foundMessage:
      'Hebat! Penutup peti pusaka terbuka dan helaian kedua melayang keluar dengan cahaya keemasan.',
    hint: 'Perhatikan peti kayu berukir tembaga di sudut belakang sebelah kiri. Cuba buka penutupnya.',
    worldPos: { x: -5.1, y: 1.4, z: -5.2 },
    approachPos: { x: -3.9, z: -4.4 },
  },
  {
    id: 'tingkap',
    title: 'Helaian Ketiga: Malam Kabus Tebal',
    locationName: 'Tingkap Berukir',
    inspectPrompt: 'Periksa Tingkap Berukir',
    foundMessage:
      'Bagus sekali! Sinaran matahari di tingkap berukir mendedahkan helaian ketiga.',
    hint: 'Pandang ke arah tingkap berukir di dinding sebelah kanan tempat sinaran matahari masuk menyinari lantai.',
    worldPos: { x: 5.5, y: 1.7, z: -1.8 },
    approachPos: { x: 4.3, z: -1.8 },
  },
  {
    id: 'meja',
    title: 'Helaian Keempat: Cahaya di Balai Kampung',
    locationName: 'Meja Penulisan',
    inspectPrompt: 'Periksa Meja Penulisan',
    foundMessage:
      'Tahniah! Di bawah gulungan kertas di meja penulisan tersimpan helaian keempat.',
    hint: 'Di meja penulisan sebelah kanan belakang terdapat bekas dakwat dan gulungan kertas. Cuba periksa di bawahnya.',
    worldPos: { x: 4.8, y: 1.5, z: -4.9 },
    approachPos: { x: 3.6, z: -4.1 },
  },
  {
    id: 'pelita',
    title: 'Helaian Kelima: Lambang Warisan Desa',
    locationName: 'Pelita Warisan',
    inspectPrompt: 'Sentuh Pelita Warisan',
    foundMessage:
      'Menakjubkan! Sentuhanmu menyalakan Pelita Warisan dan memunculkan helaian terakhir!',
    hint: 'Berhampiran meja utama berdiri Pelita Warisan di atas kaki tembaga. Sentuh pelita itu untuk melihat keajaibannya.',
    worldPos: { x: -1.8, y: 1.6, z: -3.6 },
    approachPos: { x: -1.8, z: -2.4 },
  },
];

export const KITAB_STATION = {
  locationName: 'Kitab Warisan',
  worldPos: { x: 0, y: 1.5, z: -4.0 },
  approachPos: { x: 0, z: -2.4 },
};

export const STORY_PAGES: StoryPage[] = [
  {
    pageNumber: 1,
    title: 'Halaman 1 · Penemuan di Tepi Sungai',
    text: 'Pada suatu pagi yang cerah, Melur berjalan-jalan di tepi sungai Desa Warisan sambil menikmati kicauan burung. Tiba-tiba, matanya tertumpu pada kilauan cahaya di celah akar pokok besar. Rupa-rupanya terdapat sebuah pelita tembaga lama yang tersembunyi di situ.',
    narrationText:
      'Halaman satu. Penemuan di Tepi Sungai. Pada suatu pagi yang cerah, Melur berjalan-jalan di tepi sungai Desa Warisan sambil menikmati kicauan burung. Tiba-tiba, matanya tertumpu pada kilauan cahaya di celah akar pokok besar. Rupa-rupanya terdapat sebuah pelita tembaga lama yang tersembunyi di situ.',
    imagePath: '/misi1/src/assets/images/story_page_1_1794930837095.jpg',
  },
  {
    pageNumber: 2,
    title: 'Halaman 2 · Kisah daripada Tok Penghulu',
    text: 'Melur membawa pelita tembaga itu berjumpa dengan Tok Penghulu di serambi rumah. Tok Penghulu tersenyum lalu menerangkan bahawa pelita tersebut ialah Pelita Warisan kampung. Pada zaman dahulu, pelita itu dinyalakan sebagai panduan ketika kabus tebal melanda desa.',
    narrationText:
      'Halaman dua. Kisah daripada Tok Penghulu. Melur membawa pelita tembaga itu berjumpa dengan Tok Penghulu di serambi rumah. Tok Penghulu tersenyum lalu menerangkan bahawa pelita tersebut ialah Pelita Warisan kampung. Pada zaman dahulu, pelita itu dinyalakan sebagai panduan ketika kabus tebal melanda desa.',
    imagePath: '/misi1/src/assets/images/story_page_2_1794930837263.jpg',
  },
  {
    pageNumber: 3,
    title: 'Halaman 3 · Kabus Tebal Menyelubungi Kampung',
    text: 'Pada malam berikutnya, kabus tebal tiba-tiba turun menyelubungi seluruh Desa Warisan. Suasana menjadi kelam sehingga penduduk kampung sukar melihat laluan untuk pulang ke rumah masing-masing dengan selamat.',
    narrationText:
      'Halaman tiga. Kabus Tebal Menyelubungi Kampung. Pada malam berikutnya, kabus tebal tiba-tiba turun menyelubungi seluruh Desa Warisan. Suasana menjadi kelam sehingga penduduk kampung sukar melihat laluan untuk pulang ke rumah masing-masing dengan selamat.',
    imagePath: '/misi1/src/assets/images/story_page_3_1794930839118.jpg',
  },
  {
    pageNumber: 4,
    title: 'Halaman 4 · Sinar Pelita di Balai Kampung',
    text: 'Melur dan rakan-rakannya segera berganding bahu membersihkan pelita lama itu di balai kampung. Mereka menyalakan sumbunya bersama-sama. Tidak lama kemudian, cahaya keemasan yang terang memancar menembusi kabus dan membimbing penduduk pulang ke pangkuan keluarga.',
    narrationText:
      'Halaman empat. Sinar Pelita di Balai Kampung. Melur dan rakan-rakannya segera berganding bahu membersihkan pelita lama itu di balai kampung. Mereka menyalakan sumbunya bersama-sama. Tidak lama kemudian, cahaya keemasan yang terang memancar menembusi kabus dan membimbing penduduk pulang ke pangkuan keluarga.',
    imagePath: '/misi1/src/assets/images/story_page_4_1794930839332.jpg',
  },
  {
    pageNumber: 5,
    title: 'Halaman 5 · Lambang Kasih dan Warisan',
    text: 'Sejak malam itu, seluruh penduduk Desa Warisan sepakat menjaga Pelita Warisan bersama-sama. Pelita itu bukan sahaja menerangi desa ketika gelap, malah menjadi lambang kasih sayang, sikap kerjasama, tanggungjawab dan warisan berharga masyarakat kampung.',
    narrationText:
      'Halaman lima. Lambang Kasih dan Warisan. Sejak malam itu, seluruh penduduk Desa Warisan sepakat menjaga Pelita Warisan bersama-sama. Pelita itu bukan sahaja menerangi desa ketika gelap, malah menjadi lambang kasih sayang, sikap kerjasama, tanggungjawab dan warisan berharga masyarakat kampung.',
    imagePath: '/misi1/src/assets/images/story_page_5_1794930838727.jpg',
  },
];

export const SEQUENCE_EVENTS: SequenceEvent[] = [
  {
    id: 'ev-1',
    correctIndex: 0,
    title: 'Melur Menemukan Pelita Lama',
    summary: 'Melur berjalan di tepi sungai lalu menemukan pelita tembaga lama di celah akar pokok besar.',
    imagePath: '/misi1/src/assets/images/story_page_1_1794930837095.jpg',
  },
  {
    id: 'ev-2',
    correctIndex: 1,
    title: 'Penjelasan Tok Penghulu',
    summary: 'Tok Penghulu menerangkan bahawa pelita itu ialah warisan kampung sebagai panduan ketika kabus tebal.',
    imagePath: '/misi1/src/assets/images/story_page_2_1794930837263.jpg',
  },
  {
    id: 'ev-3',
    correctIndex: 2,
    title: 'Kabus Tebal Melanda Desa',
    summary: 'Kabus tebal menyelubungi kampung pada waktu malam sehingga penduduk sukar mencari jalan pulang.',
    imagePath: '/misi1/src/assets/images/story_page_3_1794930839118.jpg',
  },
  {
    id: 'ev-4',
    correctIndex: 3,
    title: 'Menyalakan Pelita Bersama-sama',
    summary: 'Melur dan rakan-rakannya membersihkan serta menyalakan pelita di balai kampung untuk menerangi jalan.',
    imagePath: '/misi1/src/assets/images/story_page_4_1794930839332.jpg',
  },
  {
    id: 'ev-5',
    correctIndex: 4,
    title: 'Penduduk Menjaga Pelita Warisan',
    summary: 'Penduduk bekerjasama menjaga pelita sebagai lambang kasih sayang, tanggungjawab dan warisan desa.',
    imagePath: '/misi1/src/assets/images/story_page_5_1794930838727.jpg',
  },
];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Di manakah Melur menemukan pelita lama?',
    options: [
      { id: 'gua', label: 'Di dalam gua' },
      { id: 'sungai', label: 'Di tepi sungai' },
      { id: 'pasar', label: 'Di kawasan pasar' },
      { id: 'pentas', label: 'Di atas pentas' },
    ],
    correctOptionId: 'sungai',
    wrongExplanation:
      'Belum tepat. Cuba ingat semula tempat Melur berjalan pada waktu pagi sebelum melihat kilauan pelita di celah akar pokok besar.',
    hint: 'Cuba baca semula Halaman 1 kisah Cahaya Pelita di Desa Warisan.',
  },
  {
    id: 'q2',
    question: 'Mengapakah pelita digunakan oleh penduduk kampung?',
    options: [
      { id: 'pertandingan', label: 'Untuk pertandingan' },
      { id: 'hiasan', label: 'Untuk menghias rumah' },
      { id: 'kabus', label: 'Untuk membantu penduduk mencari jalan ketika kabus' },
      { id: 'jual', label: 'Untuk dijual di pasar' },
    ],
    correctOptionId: 'kabus',
    wrongExplanation:
      'Kurang tepat. Tok Penghulu menceritakan kegunaan pelita ini apabila kampung dilanda cuaca gelap yang menyukarkan perjalanan.',
    hint: 'Semak penjelasan Tok Penghulu pada Halaman 2 dan peristiwa pada Halaman 3.',
  },
  {
    id: 'q3',
    question: 'Apakah pengajaran utama daripada kisah tersebut?',
    options: [
      { id: 'kerjasama', label: 'Kerjasama dan tanggungjawab' },
      { id: 'mementingkan_diri', label: 'Sikap mementingkan diri' },
      { id: 'persaingan', label: 'Persaingan mendapatkan hadiah' },
      { id: 'tidak_peduli', label: 'Tidak perlu membantu orang lain' },
    ],
    correctOptionId: 'kerjasama',
    wrongExplanation:
      'Cuba fikirkan nilai murni yang ditunjukkan apabila Melur, rakan-rakan dan seluruh penduduk kampung menjaga pelita bersama-sama.',
    hint: 'Teliti penutup cerita pada Halaman 5 tentang sebab penduduk menjaga Pelita Warisan.',
  },
];

export const INTRO_DIALOGUE =
  'Wahai pengembara muda! Lima helaian penting daripada Kitab Warisan telah hilang. Tanpanya, rahsia Pelita Warisan tidak dapat diketahui. Ayuh bantu aku mencarinya supaya kisah ini dapat dipulihkan!';
