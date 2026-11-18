# Dashboard Guru — 12 menu ringkas

## Susunan menu
1. Laman Utama
2. Pengurusan Murid
3. Pengurusan Kelas
4. Pemantauan Empat Misi
5. Pengurusan Tugasan
6. Pusat Semakan Tugasan
7. Pentaksiran PBD
8. Analisis Prestasi
9. Maklum Balas
10. Portfolio Digital
11. Laporan dan Eksport
12. Tetapan Guru

## Pelaksanaan semasa

- Menu sebelah kiri (bukan tab) dan halaman berasingan bagi setiap menu.
- Menggunakan CSS asal (hijau hutan, krim, emas lembut); perubahan hanya untuk komponen baru.
- Aktiviti 4 misi, portal murid, admin dan halaman sedia ada tidak diubah.
- Halaman Pengurusan Murid dan Pengurusan Kelas mempunyai struktur statistik/jadual serta pratonton borang pendaftaran. **Tiada akaun sebenar diwujudkan:** tindakan daftar/cipta sengaja dinyahaktifkan. Ini bukan sistem log masuk rasmi.
- Komponen PBD, Analisis, Maklum Balas, Portfolio, Laporan dan Tetapan ialah struktur UI sahaja. Data sebenar dan penghantaran rakaman belum disambungkan.

## Keperluan untuk mengaktifkan akaun murid

Portal semasa ialah prototaip awam tanpa pengesahan guru atau pangkalan data berkekalan. Jangan menggunakan localStorage atau JavaScript pelayar untuk jana dan menyimpan kata laluan murid. Sebelum membenarkan pendaftaran sebenar, perlukan:

1. Pangkalan data berkekalan (contohnya PostgreSQL yang diuruskan), migrasi jadual guru/kelas/murid/keahlian dan rekod audit;
2. Log masuk guru yang disahkan, sesi HTTP-only, SameSite, HTTPS, CSRF, had percubaan log masuk serta autorisasi kelas mengikut identiti guru;
3. ID murid unik yang tidak mengandungi maklumat sensitif; kata laluan sementara rawak dijana di backend, hash kuat (Argon2id/scrypt), dipaparkan sekali semasa pendaftaran dan dipaksa tukar pada log masuk pertama;
4. Titik API yang disahkan untuk cipta/kemas kini/nyahaktif/pindah kelas, import CSV secara selamat, kawalan data murid dan dasar retensi;
5. Peraturan akses rakaman audio/video Misi 4 secara persendirian, tanpa pautan awam;
6. Ujian integrasi peranan guru-murid, pengasingan data kelas, kegagalan backend, penghantaran dan perlindungan akses.

Jangan masukkan kata laluan DB/API dalam GitHub. Render hanya boleh menerbitkan UI sekarang; fungsi pendaftaran rasmi memerlukan konfigurasi di atas.

## Semakan pemasangan

```sh
npm run check
npm test
npm run build
```

Selepas deployment Render menjadi Live, semak `/teacher-dashboard.js` dan `/teacher-dashboard.css` boleh dimuat turun dengan status HTTP 200, kemudian buka `/#guru` dan klik setiap satu daripada 12 menu.
