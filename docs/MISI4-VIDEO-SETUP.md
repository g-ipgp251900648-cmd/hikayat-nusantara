# Misi 4 — penghantaran rakaman kepada guru

## Status
Kod backend, paparan pilihan video dan senarai rakaman guru sudah disambungkan di GitHub, tetapi **tidak aktif** sehingga pangkalan data dan storan objek persendirian disediakan. Jangan gunakan video sebenar murid sebelum pengujian akses dan pematuhan sekolah selesai.

## Konfigurasi Render
Tetapkan environment variables pada servis web Render (jangan letakkan rahsia dalam GitHub):
- `DATABASE_URL` — PostgreSQL institusi (sedia ada)
- `S3_ENDPOINT` — URL HTTPS penuh untuk API S3-compatible, contoh endpoint penyedia storan (tanpa nama bucket di hujung)
- `S3_REGION` — rantau penyedia; sesetengah storan S3-compatible menggunakan `auto`
- `S3_BUCKET` — bucket persendirian khusus bahan pembelajaran
- `S3_ACCESS_KEY_ID` dan `S3_SECRET_ACCESS_KEY` — kunci terhad untuk bucket tersebut

Jalankan `npm run db:migrate` sekali pada pangkalan data sasaran selepas kod terkini dideploy. Perintah ini juga memasukkan jadual `hn_misi4_videos`.

## Tetapan bucket
- Private: block public access; gunakan polisi akses minimum.
- CORS untuk origin `https://hikayat-nusantara-portal.onrender.com`: kaedah `PUT`, `HEAD`, `GET`; header `Content-Type`. Prefight `OPTIONS` perlu dibenarkan oleh penyedia.
- Hadkan storan, tempoh simpanan, akses dan pemadaman mengikut dasar institusi.
- Elakkan kunci akaun induk. Jangan hantar kunci kepada murid.
- URL PUT sementara sah 10 minit; URL GET sementara 3 minit.

## Aliran yang tersedia
1. Murid log masuk dan buka Misi 4.
2. Murid merakam dalam aplikasi dan menyimpan video ke peranti.
3. Klik **Hantar Rakaman kepada Guru** pada bar Misi 4 dan pilih fail WebM/MP4 (maks 100 MB).
4. Portal meminta URL muat naik sementara, memindahkan fail terus ke storan persendirian, lalu meminta pelayan menyemak saiz sebenar melalui HEAD.
5. Selepas resit disahkan, rekod `submitted` boleh dibuka oleh guru kelas di **Portfolio Digital**.
6. Guru tonton video dan gunakan menu **PBD** dan **Maklum Balas Guru** sedia ada untuk penilaian; murid hanya melihat maklum balas selepas diterbitkan.

**Had semasa:** Ini bukan lagi penghantaran terus daripada butang asal dalam iframe Studio. Murid masih perlu memilih fail rakaman selepas menyimpannya. Penyambungan satu-klik daripada pemegang rakaman dalaman Misi 4 memerlukan perubahan pada sumber aplikasi asal. Jangan dakwa ia sudah automatik penuh.

## Ujian wajib sebelum penggunaan
1. `/health` mengembalikan 200.
2. `/api/misi4/health` memerlukan akaun sah dan storan dikonfigurasi.
3. Log masuk murid ujian, muat naik WebM kecil, tunggu resit berjaya; sahkan rekod di `/api/misi4/state`.
4. Log masuk guru kelas murid itu; sahkan video boleh dimainkan di Portfolio Digital.
5. Guru kelas lain tidak boleh melihat video tersebut.
6. Guru menerbitkan maklum balas Misi 4; murid melihatnya selepas log masuk.
7. Simulasi kegagalan muat naik: jangan papar berjaya apabila objek tiada atau saiz salah.
8. Uji pada telefon/tablet serta desktop, kamera dan mikrofon dengan kebenaran pengguna.

**Nota keselamatan:** Video murid mengandungi data peribadi. Dapatkan persetujuan yang berkenaan, tetapkan polisi retensi dan sekat akses mengikut peranan. Jangan simpan rakaman di direktori sementara Render atau repositori GitHub.
