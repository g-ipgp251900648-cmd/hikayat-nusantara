# Hikayat Nusantara — Fasa 1

Prototaip visual **homepage** dan tiga dashboard (**Murid**, **Guru**, **Admin**) berdasarkan RPH *Misteri Pelita Warisan* Bahasa Melayu Tahun 5.

## Apa yang telah berfungsi

- Halaman utama dengan navigasi ke tiga dashboard.
- Dashboard murid: peta ilustrasi, empat misi RPH, kad aktiviti, portfolio contoh dan lencana.
- Dashboard guru: statistik contoh, carian dalam senarai murid dan pratonton komen.
- Dashboard admin: statistik contoh, perbandingan kemajuan kelas, pemantauan guru dan senarai integrasi.
- Paparan responsif untuk komputer dan telefon.

## Apa yang BELUM berfungsi

- Tiada pengesahan identiti atau kebenaran peranan.
- Tiada pangkalan data, storan media atau penyimpanan komen/markah.
- Belum mengandungi permainan sebenar, editor cerita atau muat naik video.
- Semua nama murid, markah, carta dan status ialah **data demonstrasi rekaan**, bukan rekod sebenar.
- Jangan masukkan maklumat sebenar murid sehingga backend, pengesahan, perlindungan data dan kebenaran sekolah siap.

## Cara uji pada komputer

Buka `index.html` dalam pelayar atau jalankan pelayan statik tempatan. Semua halaman dipaparkan daripada fail yang sama.

## Deploy ke Render (Static Site)

1. Semak Pull Request `feature/homepage-tiga-dashboard`.
2. Klik **Merge pull request** hanya apabila berpuas hati.
3. Pada Render, cipta **Static Site** yang menggunakan repositori dan branch `main`, jika tiada site statik sedia ada.
4. Tetapkan **Build Command**: `npm run build`.
5. Tetapkan **Publish Directory**: `dist`.
6. Pilih **Deploy** dan buka alamat `onrender.com` yang Render berikan.

Jika projek Render sedia ada ialah **Web Service**, jangan tukar tetapan secara terburu-buru. Nilai jenis service dahulu agar deployment lama tidak terjejas.

## Struktur fail

- `index.html` — susun atur semua halaman
- `styles.css` — visual nostalgia premium dan responsif
- `app.js` — navigasi, dialog misi, carian dan pratonton komen
- `build.mjs` — hasilkan folder `dist` tanpa dependency
- `render.yaml` — konfigurasi pilihan untuk Render Blueprint

## Fasa 2 seterusnya

Bina pengesahan identiti pengguna, akses berasaskan peranan, Neon PostgreSQL, penyimpanan versi draf, jejak audit dan kawalan keselamatan. Hanya selepas itu, aktfikan penghantaran karya dan komen sebenar.
