# Integrasi Misi 1 ASAL Google AI Studio ke Hikayat Nusantara

Pakej ini menggunakan **kod asal projek Google AI Studio yang dimuat naik**, termasuk dunia 3D, Hang Tuah, tekstur, logik permainan, lima ilustrasi buku cerita, muzik Web Audio serta mod 2D. Bukan permainan rekaan semula daripada prompt.

## Fail dalam pakej

- `mission-one-ai/`: kod asal React, Three.js, TypeScript dan imej ilustrasi pengguna.
- `mission-one-ai/src/App.tsx`: disesuaikan sedikit untuk menghantar rekod percubaan dan kemenangan kepada Dashboard Murid apabila dibuka dari portal.
- `mission-one-ai/vite.config.ts`: ditetapkan untuk membina aplikasi di URL `/misi1/` dan `dist/misi1/`.
- `mission-one-ai-bridge.js`: membuka permainan asal dalam iframe sama-origin, dengan butang `Kembali ke Dashboard` dan penerimaan markah.
- `integrate_into_repo.py`: skrip yang memasang fail dan mengemas kini `index.html`, `build.mjs`, `server.js`, `package.json` dalam checkout GitHub tempatan.
- `tests/mission-one.test.mjs`: ujian integrasi asas.

## Cara guna dalam repository GitHub

1. Buka terminal dan klon repository sedia ada:
   ```bash
   git clone https://github.com/g-ipgp251900648-cmd/hikayat-nusantara.git
   ```
2. Ekstrak pakej ZIP ini. Jalankan skrip integrasi dengan Python 3.10+:
   ```bash
   python integrate_into_repo.py --repo /laluan/ke/hikayat-nusantara
   ```
   Di Windows, contoh:
   ```powershell
   py integrate_into_repo.py --repo "C:\Users\Nama\Documents\hikayat-nusantara"
   ```
3. Dalam folder repository, bina dan uji:
   ```bash
   npm install
   npm run check
   npm test
   npm run build
   npm start
   ```
4. Buka `http://localhost:10000/`, pergi ke **Dashboard Murid → Aktiviti 1**. Permainan asal dibuka dalam skrin penuh. URL permainan langsung ialah `http://localhost:10000/misi1/`.
5. Selepas berpuas hati, buat Git commit dan push melalui GitHub Desktop atau terminal. Render yang ditetapkan menggunakan branch `main` akan deploy commit terbaharu jika auto-deploy diaktifkan.

## Aliran kemajuan dan pemarkahan

- Permainan asal mengurus lima helaian, lima halaman, susunan lima peristiwa dan tiga soalan pemahaman.
- Apabila murid menekan `Semak Jawapan & Rekod`, permainan menghantar bukti ke portal melalui `postMessage` **sama-origin**.
- `mission-one-ai-bridge.js` mengesahkan ID helaian, halaman, susunan dan pilihan jawapan sebelum memanggil fungsi asal `submitMissionOneAdventure` dalam portal.
- Portal merekodkan skor sehingga 8 markah dan hanya menandakan Misi 1 siap (60 XP) apabila mencapai 8/8.
- Misi 2–4 tidak diubah. Sijil akhir kekal tertakluk kepada aliran semakan guru yang digunakan oleh portal.
- Rekod pada prototaip ini masih berada dalam `localStorage` peranti, bukan pangkalan data rasmi murid.

## Audio dan imej

Muzik asal menggunakan sintesis Web Audio dalam `src/game/audio.ts`, bukan fail MP3 komersial. Lima JPG asal dalam ZIP **dikekalkan** tanpa pemampatan semula supaya ilustrasi sama seperti projek Google AI Studio.

## Had pengesahan

Pakej ini disusun daripada sumber ZIP yang dihantar dan diaudit secara statik. Ujian runtime React/Vite memerlukan pemasangan npm pada mesin yang ada internet. Perubahan **tidak secara automatik diterbitkan ke GitHub** oleh fail ZIP ini; penggunaan di laman Render memerlukan commit/push atau kaedah muat naik melalui GitHub.
