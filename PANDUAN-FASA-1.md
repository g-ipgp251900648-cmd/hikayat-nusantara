# Hikayat Nusantara — Fasa 1 (Web Service)

Prototaip visual **homepage** dan tiga dashboard (**Murid**, **Guru**, **Admin**) berdasarkan RPH *Misteri Pelita Warisan* Bahasa Melayu Tahun 5.

## Apa yang boleh diuji

- Homepage bertema nostalgia Nusantara serta pilihan Murid, Guru dan Admin.
- Dashboard Murid: peta empat misi RPH, kad aktiviti, portfolio dan ganjaran (semuanya contoh).
- Dashboard Guru: statistik kelas, graf, carian rekod contoh dan pratonton komen.
- Dashboard Admin: statistik demo, perbandingan kemajuan kelas dan status cadangan integrasi.
- Paparan responsif, menu, navigasi serta dialog penerangan misi.
- Server Node.js menghidangkan UI dan endpoint pemeriksaan kesihatan `/health`.

## Batasan dan keselamatan

- **Belum ada pengesahan pengguna atau kawalan peranan.** Setiap dashboard adalah pratonton yang boleh dibuka oleh sesiapa sahaja.
- **Jangan masukkan data sebenar murid, guru atau sekolah**. Semua rekod, maklum balas dan skor adalah data rekaan.
- **Belum ada penyimpanan data atau muat naik fail**. Ruang komen hanya boleh dipratonton, bukan disimpan.
- Pangkalan data Neon, storan media, pengesahan akaun, jejak audit dan penyimpanan draf akan dibina pada fasa berikutnya.

## Cara uji di komputer

1. Pasang Node.js versi 20 atau lebih baharu.
2. Jalankan `npm run check`.
3. Jalankan `npm run build`.
4. Jalankan `npm start`.
5. Buka `http://localhost:10000/`, lalu cuba pilihan Murid, Guru dan Admin.
6. Semak `http://localhost:10000/health` — mesti memberi respons JSON `status: ok`.

## Deploy ke Render sebagai Web Service baharu

**Jangan ubah servis lama** `hikayat-nusantara-3d-preview`, kerana servis tersebut menjalankan Python dan menggunakan repository berlainan.

1. Semak Pull Request `feature/render-node-web-service` dan gabungkan ke branch `main` selepas bersetuju.
2. Pada Render Dashboard pilih **New → Web Service**.
3. Sambungkan repository GitHub: `g-ipgp251900648-cmd/hikayat-nusantara` (tanda sempang).
4. Pilih branch `main`, runtime `Node`, dan nama `hikayat-nusantara-portal` (jika masih tersedia).
5. Root Directory: biarkan kosong.
6. Build Command: `npm run build`.
7. Start Command: `npm start`.
8. Health Check Path: `/health` (jika pilihan ini tersedia).
9. Pilih pelan sesuai; `Free` jika ditawarkan dan mencukupi.
10. Cipta Web Service dan semak status deployment. Render memberikan URL sebenar selepas berjaya.

Fail `render.yaml` juga menyediakan konfigurasi sama sekiranya anda memilih kaedah Render Blueprint.

## Fail penting

- `index.html` — homepage + ketiga-tiga dashboard.
- `styles.css` — reka bentuk responsif.
- `app.js` — navigasi, dialog misi, carian dan pratonton komen.
- `build.mjs` — salin fail UI ke folder `dist`.
- `server.js` — server Node.js, laluan UI dan `/health`.
- `package.json` — arahan build, start dan check.
- `render.yaml` — pilihan Blueprint Web Service.

## Fasa berikutnya

Bina sistem log masuk dan kebenaran berasaskan peranan dahulu, kemudian hubungkan Neon PostgreSQL, storan fail, penghantaran karya, komen guru, pengumpulan markah dan statistik admin.

## Fasa 1C — Reka bentuk 3D bergerak (17 November 2026)

Kemas kini ini mengubah **visual sahaja**. Semua struktur misi, dashboard, nama tugasan dan kod backend Fasa 1B dikekalkan.

- Dunia kampung Melayu 3D beranimasi pada homepage (dibina melalui Three.js, model asli berbentuk geometri).
- Rumah tradisional, sampan bergerak, sungai beralun, jambatan, awan, pepohon dan pelita bercahaya.
- Seret pada kanvas untuk mengubah sudut pemandangan secara lembut.
- Pilihan **Lihat 2D / Lihat 3D** untuk kembali kepada ilustrasi SVG asal.
- Pilihan **Henti animasi / Gerakkan**; menghormati tetapan sistem `prefers-reduced-motion`.
- Kad pemilihan peranan mempunyai kesan kedalaman apabila menggunakan tetikus.
- Peta murid, ikon misi dan ringkasan dashboard menerima animasi ringan.
- Jika WebGL atau CDN 3D gagal, ilustrasi lama kekal sebagai fallback.

### Teknikal dan perkara yang perlu diperhatikan

- `world3d.js` memuatkan Three.js versi `0.177.0` dari jsDelivr; sambungan internet diperlukan untuk pengalaman 3D. Ilustrasi 2D tidak bergantung pada CDN ini.
- `npm run build` kini turut menyalin `world3d.js` ke folder `dist`.
- Server Node.js membenarkan fail modul `/world3d.js`.
- **Tiada data peribadi disimpan** oleh tambahan visual ini. Semua markah dan komen masih data demo.
- Pelan Render boleh diteruskan: **Build** `npm run build`, **Start** `npm start`.
- Jika Render anda tidak menggunakan auto-deploy, pilih **Manual Deploy → Deploy latest commit** selepas Pull Request digabungkan.

### Cara semak pengalaman

1. Buka URL Render `hikayat-nusantara-portal` dan pastikan terdapat dunia kampung 3D pada homepage.
2. Cuba seret pemandangan; awan, sampan dan pelita sepatutnya bergerak.
3. Klik **Henti animasi**, kemudian **Lihat 2D**, dan kembali ke **Lihat 3D**.
4. Semak dashboard Murid, Guru dan Admin; semua navigasi terdahulu perlu terus berfungsi.
5. Uji skrin telefon. Jika prestasi terhad, gunakan mod 2D atau hentikan animasi.

**Nota:** Ini masih prototaip. Jangan masukkan maklumat murid sebenar atau menganggap peranan dashboard sebagai pengesahan login.


## Fasa 1D — Kampung 3D lebih terperinci & teks bergerak

Kemas kini pada branch `upgrade-kampung-3d-detail`:

- Rumah Melayu: bingkai tingkap, trim ukiran, serambi, tangga, bumbung bergaris, hiasan pagar.
- Flora: pokok kelapa tambahan, bunga dan dedaun beranimasi.
- Sungai: riak cahaya tambahan dan perahu kedua berayun.
- Langit: awan tambahan yang beralih pada kelajuan sedikit berbeza.
- Tipografi: font Fraunces untuk tajuk dan animasi perkataan berombak.
- Teks tambahan dan kad menerima gerakan ringan dan kesan hover.
- Kekalkan kawalan **Lihat 2D / Lihat 3D** serta **Henti animasi**.
- Mod `prefers-reduced-motion` mematikan animasi teks dan gerakan 3D secara lalai.

**Belum ada pengumpulan data sebenar**: dashboard masih mod demo. Semua kerja ini untuk bahagian visual sahaja.

### Selepas merge
Render → `hikayat-nusantara-portal` → tunggu auto-deploy atau pilih **Manual Deploy → Deploy latest commit**. Kemudian muat semula website secara paksa (Ctrl+Shift+R) untuk mendapatkan CSS/JavaScript terkini.

### Jika ada masalah
- Kanvas hitam: semak sambungan Three.js dan sokongan WebGL. Tukar ke paparan 2D.
- Lag pada telefon: tekan **Henti animasi** atau gunakan **Lihat 2D**.
- Tulisan terlalu aktif: butang henti animasi juga menghentikan gerakan CSS.


## Fasa 1E — Panorama Kampung Warisan berdasarkan rujukan visual

- Ilustrasi diorama terapung diganti dengan bentang landskap bersambung (panorama).
- Gunung dan hutan berlapis, sawah padi berteres di kiri, aliran sungai berliku dari ufuk ke hadapan, jambatan buluh berkekisi dan rumah Melayu bertiang beratap rumbia di kanan.
- Tekstur bumbung dan dinding kayu dijana secara prosedural oleh CanvasTexture; tidak mengandungi imej luaran atau salinan gambar rujukan.
- Perincian kampung seperti kain tenunan, bunga, kelapa, sampan dan siluet penduduk ditambah.
- Animasi 3D sedia ada (awan, sungai, sampan, daun, pelita) masih berfungsi, termasuk pilihan paparan 2D dan henti animasi.
- Susun atur, tiga dashboard, logik routing dan pelayan Render tidak diubah.

**Penting:** Ini adalah adaptasi Three.js yang distilisasi mengikut komposisi imej rujukan, bukan hasil pelukisan semula gambar rujukan atau fotorealisme. Paparan akhir perlu diuji pada peranti sebenar selepas deploy. Ilustrasi SVG asal masih digunakan dalam mod 2D.

### Ujian selepas deploy

1. Lihat panorama: tiada tapak pulau terapung; rumah di kanan, sawah di kiri, sungai dan jambatan di tengah.
2. Uji butang Lihat 2D dan Henti animasi, serta gerakkan tetikus di panel.
3. Semak responsiveness, khususnya prestasi di telefon; gunakan mod 2D jika animasi terlalu berat.
4. Semak dashboard Murid, Guru dan Admin masih boleh dibuka.


## Fasa 2A — Dashboard Murid: Desa Hikayat 3D (prototaip)

Bahagian peta dunia kini menjadi paparan pertama apabila murid memilih dashboard Murid.

### Empat lokasi berasaskan RPH Tahun 5
1. **Rumah Naskhah Pusaka (10 minit)** — membaca/mendengar cerita, susun 5 peristiwa dan jawab 3 soalan pemahaman.
2. **Balai Olah Hikayat (15 minit)** — memilih watak/latar/peristiwa dan mengubah suai cerita.
3. **Taman Bahasa Ajaib (10 minit)** — 4 cabaran pilihan bahasa indah dan santun.
4. **Pentas Warisan (15 minit)** — merancang dan mempersembahkan cerita dengan rakaman suara atau video.

### Ciri-ciri
- Peta kampung 3D WebGL dengan rumah kayu, balai, taman, pentas, sungai, jambatan, sawah, pelita, awan dan pohon.
- Tekan label lokasi atau bangunan 3D untuk memfokuskan pemandangan dan membaca penerangan misi.
- Tekan **Lihat misi (demo)** untuk membuka dialog pratonton sedia ada; kandungan misi sebenar belum diaktifkan.
- Butang **Lihat 2D / Lihat 3D** dan **Henti gerakan / Gerakkan**, serta tetapan sistem `prefers-reduced-motion`.
- SVG asal dikekalkan sebagai paparan fallback jika Three.js atau WebGL tidak tersedia.
- Ringkasan dan portfolio dikekalkan di bawah peta; Dashboard Guru dan Admin tidak diubah.
- Mod demonstrasi menggunakan kemajuan 0/4; belum ada penyimpanan data, identiti sebenar atau sistem ganjaran.

### Nota keselamatan dan etika
Dashboard masih terbuka dan bukan aplikasi log masuk sebenar. **Jangan masukkan nama penuh murid, karya peribadi, rakaman sebenar atau data sensitif** sehingga akaun yang sah, perlindungan data dan storan dilaksanakan.

### Deploy melalui GitHub dan Render
Gabungkan PR melalui butang *Merge pull request* di GitHub. Jika Render tidak auto-deploy, buka Web Service `hikayat-nusantara-portal` dan klik **Manual Deploy → Deploy latest commit**. Semak:
- Menu Murid membuka Desa Hikayat 3D dengan empat lokasi.
- Klik semua lokasi, kemudian **Lihat misi (demo)**.
- Tukar ke 2D dan hentikan animasi.
- Semak paparan telefon dan fungsi Dashboard Guru/Admin.


## Fasa 2B — Fungsi pembelajaran sebenar (latihan demo setempat)

Dashboard Murid kini bukan hanya pratonton. Empat misi boleh dibuka melalui label peta, kad misi, atau butang **Teruskan Misi** pada papan kemajuan.

### Misi 1: Jejak Naskhah Pusaka (10 minit)
- Cerita pendek asal berjudul *Cahaya di Desa Warisan* (5 perenggan).
- Butang **Dengar cerita** menggunakan SpeechSynthesis API pada peranti yang menyokong bacaan Bahasa Melayu.
- Murid menyusun **5 peristiwa** menggunakan butang naik/turun (sesuai juga untuk papan kekunci).
- Murid menjawab **3 soalan pemahaman objektif**, melihat petunjuk jika salah dan mencuba semula.
- Latihan misi selesai apabila urutan dan ketiga-tiga jawapan tepat.

### Misi 2: Balai Olah Hikayat (15 minit)
- Murid memilih **watak, latar dan peristiwa**.
- **Bank Ungkapan Indah** memasukkan frasa pilihan ke dalam draf.
- Murid menulis cerita yang diubah suai; semakan automatik asas memerlukan sekurang-kurangnya 70 aksara dan dua ungkapan dipilih yang benar-benar digunakan.
- Semakan ini **bukan** penilaian mutu bahasa oleh guru, hanya galakan melengkapkan aktiviti.

### Misi 3: Warisan Bahasa (10 minit)
- **4 cabaran aneka pilihan** tentang ungkapan indah dan kesantunan bahasa.
- Maklum balas/petunjuk jika jawapan belum tepat. Selesai jika semua betul.

### Misi 4: Persembahan Hikayat (15 minit)
- Ruang **permulaan, perkembangan, pengakhiran**.
- Pilihan rancangan rakaman **suara** atau **video**.
- Senarai semak latihan sebutan/nada.
- Selesai dalam mod demonstrasi apabila tiga bahagian rancangan diisi dan latihan ditandakan.
- **Tiada rakaman, kamera, mikrofon atau muat naik yang diaktifkan** dalam prototaip; ini bukan pengesahan hasil persembahan sebenar.

### Ciri sistem
- Pelita Pembimbing: petunjuk berdasarkan misi belum selesai.
- Ganjaran latihan: XP maksimum 300; lencana misi menyala mengikut kemajuan.
- Kemajuan, pilihan dan draf **disimpan dalam localStorage pada pelayar/peranti yang sama sahaja** (jika dibenarkan), bukan pada akaun murid atau pelayan.
- Butang **Tetapkan semula latihan** meminta pengesahan sebelum memadam semua data latihan pada peranti itu.
- Portfolio mengandungi pratonton draf Misi 2 yang diisi oleh pengguna setempat.
- Komponen Dashboard Guru dan Admin **tidak disentuh**, dan masih data demonstrasi.

### Amaran privasi dan pelaksanaan
**Jangan gunakan nama penuh, maklumat peribadi, rakaman sebenar atau karya sulit murid** dalam prototaip yang belum mempunyai kawalan akaun. localStorage boleh dibaca oleh sesi lain yang menggunakan pelayar/peranti sama. Tiada penyegerakan merentas peranti, penyerahan guru atau pemarkahan guru sebenar.

### Ujian selepas deploy Render
1. Buka Dashboard Murid, tekan **Teruskan Misi 1** dan susun 5 peristiwa menggunakan anak panah.
2. Jawab 3 soalan dan tekan **Semak**; pastikan petunjuk muncul jika salah.
3. Buka Misi 2, pilih watak/latar/peristiwa, tambah dua ungkapan, tulis draf dan simpan.
4. Jawab empat cabaran Misi 3; rancang 3 bahagian persembahan Misi 4.
5. Semak lencana, XP, status 4/4 dan portfolio. Segarkan halaman: latihan di pelayar sama sepatutnya kekal.
6. Uji butang **Tetapkan semula latihan**.
7. Pastikan menu Guru dan Admin, peta 3D, Lihat 2D/3D dan mod henti gerakan berfungsi.

Build: `npm run build`, Start: `npm start`. Semakan sintaks: `npm run check`.


## Fasa 2C — Sijil Pengembara Warisan dengan kelulusan guru (DEMO)

### Aliran sebenar untuk menguji prototaip
1. Murid melengkapkan **semua empat latihan** dalam Dashboard Murid, termasuk rancangan **permulaan / perkembangan / pengakhiran** Misi 4 serta tanda telah berlatih.
2. Di bahagian **Khazanah Kejayaan → Sijil Pengembara Warisan**, sijil berubah daripada *Dikunci* kepada *Sedia Dihantar*.
3. Murid memasukkan **nama samaran DEMO** (contoh `Pengembara Melur`) sekali dan menekan **Hantar Misi 4 untuk Semakan Guru**.
4. Rekod dihantar melalui API ke **memori server Node.js** sebagai *pending*. Sijil masih terkunci.
5. Guru membuka **Dashboard Guru → Semakan Sijil**, menaip nama penyemak demo dan kunci guru dalam Render, kemudian membuka senarai penghantaran.
6. Guru membaca rancangan tiga babak Misi 4, mengisi **respons bertulis**, dan memilih sama ada **Minta Pembetulan** atau **Luluskan Sijil DEMO**.
7. Selepas guru meluluskan pada server, murid menekan **Semak Kelulusan**. Sijil demo muncul dengan **nama samaran automatik**, nama penyemak, tarikh, dan nombor rujukan sementara; murid boleh **Cetak / Simpan PDF** menggunakan dialog cetak pelayar.

### Tetapan wajib pada Render (jangan simpan rahsia di GitHub!)
- Buka Render → Web Service `hikayat-nusantara-portal` → **Environment**.
- Tambah environment variable **`CERTIFICATE_TEACHER_KEY`** dengan nilai rahsia rawak sekurang-kurangnya **16 aksara**. Jangan tulis nilai tersebut di dalam kod, issue, screenshot, atau mesej awam.
- Klik simpan dan deploy semula jika Render meminta.
- Guru hanya memasukkan kunci ini dalam Dashboard Guru pada halaman yang menggunakan HTTPS.
- Jika key tidak dikonfigurasikan, UI memaparkan status tidak tersedia dan **sijil tidak boleh diluluskan**. Ini sengaja dilakukan untuk menghalang kelulusan palsu.

### Fail baharu
- `certificate-api.js`: API demo terhad pada server untuk penghantaran, semakan guru, respons, kelulusan dan status sijil.
- `certificate-ui.js`: paparan Dashboard Murid dan Guru, status sijil, nama automatik, sijil hiasan songket dan mod cetak A4 landscape.
- `student-activities.js`: getter kemajuan empat misi sahaja; **bukan** keputusan kelulusan guru.
- `server.js` membolehkan API di atas dan memaparkan `certificate-ui.js`; `build.mjs` menyalin modul UI untuk Render.

### Penjelasan kritikal
- Ini **bukan sistem sijil rasmi**. Pada sijil tertera `SIJIL DEMONSTRASI · BUKAN SIJIL RASMI SEKOLAH`.
- Semua rekod sijil dalam server hanyalah **RAM yang sementara**; Render restart, redeploy atau proses tamat akan memadam rekod. Ini belum integrasi Neon/PostgreSQL.
- Status siap misi ialah laporan **daripada pelayar**, belum disahkan oleh akaun murid. Oleh itu, guru mesti menyemak hasil Misi 4 secara manusiawi sebelum kelulusan.
- Nama dalam sijil diperoleh daripada **nama contoh yang ditaip murid sekali**. Pengisian automatik daripada profil sebenar hanya boleh dilakukan selepas sistem log masuk sah siap.
- Jangan gunakan nama penuh atau data sebenar kanak-kanak, atau rakaman, dalam prototaip terbuka ini. Tiada pengesahan pengguna murid, perlindungan rekod berterusan atau pengurusan peranan menyeluruh.
- URL status memerlukan ID dan token rawak pemilik penghantaran; kunci guru hanya disimpan sementara di memori halaman dan tidak disimpan dalam localStorage.
- Sistem sebenar memerlukan login guru/murid, kebenaran data, pangkalan data Neon, ID sijil berterusan, audit keputusan dan kawalan capaian.

### Semak selepas deploy
- Status sijil dikunci pada kemajuan kurang 4/4.
- Setelah 4/4, hantar Misi 4 dengan nama contoh; sijil masih tidak boleh dicetak.
- Tanpa kunci guru: permintaan semakan guru ditolak.
- Dengan kunci guru salah: permintaan semakan ditolak.
- Dengan kunci guru benar: komen guru dan kelulusan tersedia.
- Minta Pembetulan: murid nampak maklum balas dan boleh baiki/hantar semula.
- Lulus: murid memuat semula status, nama muncul automatik, dan cetak menyokong format landskap.
- Restart Render: rekod demo hilang sebagaimana yang dinyatakan.
