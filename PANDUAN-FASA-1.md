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
