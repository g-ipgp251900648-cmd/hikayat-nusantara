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
