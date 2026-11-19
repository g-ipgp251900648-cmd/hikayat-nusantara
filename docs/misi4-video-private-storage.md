# Panduan Penghantaran Rakaman Misi 4 — Hikayat Nusantara

## Fungsi selepas diaktifkan

1. Murid merakam persembahan di Studio Misi 4 dan menyimpan rakaman dalam format WebM atau MP4 pada peranti.
2. Murid menekan **Hantar Rakaman kepada Guru** di bahagian atas Misi 4, kemudian memilih fail video tadi. Muat naik bermula **terus secara automatik selepas fail dipilih**, tanpa langkah penghantaran fail melalui aplikasi luar.
3. Portal menghantar video kepada **storan objek persendirian**, kemudian mencatat resit dalam Neon. Status **BERJAYA dihantar** hanya dipaparkan jika kedua-dua langkah selesai.
4. Guru kelas murid membuka **Pusat Semakan Tugasan** → **Tonton Rakaman**. Video boleh ditonton tetapi pautan tidak boleh diakses tanpa sesi Guru yang dibenarkan.
5. Guru menekan **Nilai PBD** atau **Beri Maklum Balas**. Guru menentukan TP secara manual, kemudian menerbitkan ulasan.
6. Murid membuka **Portfolio Digital** untuk melihat status video dan maklum balas/TP Guru yang telah diterbitkan.

**Had fungsi:** Rakaman permainan asal tidak boleh diambil dari kamera oleh portal secara automatik tanpa persetujuan pengguna; murid perlu memilih fail selepas merakam. Tiada fail video dipindahkan secara senyap di belakang tabir. Muat naik terhad kepada 40 MiB, WebM atau MP4.

## Konfigurasi sebelum deploy

### 1. Neon

Jalankan fail **`auth/misi4-video-migration.sql`** dalam Neon SQL Editor untuk pangkalan data `neondb` / `production`. Ini menambah metadata video sahaja; video sebenar **tidak** disimpan di Neon atau dalam GitHub.

### 2. Storan persendirian

Sediakan satu *private bucket* dalam Cloudflare R2, AWS S3 atau penyedia S3-compatible yang menyokong tandatangan AWS Signature V4. **Matikan akses awam / public bucket**. Buat kunci akses terhad kepada bucket berkenaan dan tindakan `GetObject`, `PutObject`, `DeleteObject` di prefiks `private/misi4/`. Untuk R2, pilih token yang membenarkan baca/tulis objek sahaja.

Aplikasi menggunakan **proksi server**, jadi video tidak perlu dimuat naik terus dari pelayar ke domain storan; tetapan CORS bucket tidak diperlukan untuk aliran ini.

### 3. Render

Pada servis `hikayat-nusantara-portal`, pergi ke **Environment** dan isi lima pemboleh ubah di bawah. Jangan letakkan nilainya dalam GitHub, sembang atau fail CSV murid.

| Nama | Contoh / penjelasan |
|---|---|
| `HN_VIDEO_S3_ENDPOINT` | `https://<ID-AKAUN>.r2.cloudflarestorage.com` untuk R2; `https://s3.<region>.amazonaws.com` untuk AWS S3 |
| `HN_VIDEO_S3_REGION` | `auto` untuk R2; rantau bucket sebenar untuk AWS |
| `HN_VIDEO_S3_BUCKET` | Nama bucket persendirian |
| `HN_VIDEO_S3_ACCESS_KEY_ID` | Kunci akses API storan |
| `HN_VIDEO_S3_SECRET_ACCESS_KEY` | Rahsia akses API storan |

Jalankan **Manual Deploy → Deploy latest commit**, kemudian pastikan servis **Live**. Jika pemboleh ubah tidak diisi atau storan tidak tersedia, aplikasi akan menolak penghantaran, tidak sekali-kali memaparkan kejayaan palsu.

### 4. Ujian sebelum guna dengan murid sebenar

- Gunakan akaun Guru dan Murid percubaan yang berdaftar dalam kelas yang sama; muat naik video ringkas **tanpa wajah/maklumat peribadi murid**.
- Pastikan nombor resit muncul selepas muat naik.
- Pastikan rakaman muncul di Pusat Semakan Guru dan boleh dimainkan.
- Pastikan Guru lain / murid lain tidak boleh mengakses pautan video, sekalipun mengetahui ID video.
- Uji butang **Nilai PBD**, **Beri Maklum Balas**, dan semak hasil di Portfolio Murid.
- Uji kegagalan rangkaian: fail yang gagal dimuat naik mesti dipaparkan sebagai gagal, bukannya dihantar.

## Privasi dan pengekalan

Video dan suara murid mungkin mengandungi maklumat peribadi. Dapatkan kelulusan sekolah serta persetujuan yang diperlukan sebelum menggunakan sistem dengan murid sebenar. Tetapkan tempoh simpanan dan jadual pemadaman video mengikut dasar sekolah; jangan beri akses awam kepada bucket atau URL yang boleh dikongsi tanpa pengesahan.

**Nota:** Sistem ini bukan pengganti penghakiman Guru dalam PBD; markah permainan dan resit penghantaran tidak menjana TP secara automatik.
