# Panduan Sambung Neon PostgreSQL ke Hikayat Nusantara (GitHub + Render)

**Status:** Panduan persediaan. Jangan mengaktifkan penyimpanan data murid sebenar sebelum audit keselamatan permainan Misi 1–4, storan rakaman, dan dasar institusi lengkap.

## Sebelum mula
- Projek GitHub: g-ipgp251900648-cmd/hikayat-nusantara.
- Render service: hikayat-nusantara-portal.
- PostgreSQL DB **belum disahkan tersambung** pada akaun Render.
- Jangan kongsikan DATABASE_URL, kata laluan database atau kata laluan Admin dalam chat, isu GitHub atau screenshot.

## 1. Wujudkan projek Neon
1. Log masuk ke https://console.neon.tech/ menggunakan akaun sendiri.
2. Cipta projek PostgreSQL baharu untuk Hikayat Nusantara.
3. Pilih region yang sesuai untuk pelayan dan tetapkan database.
4. Pada Connect / Connection Details, salin connection string PostgreSQL lengkap melalui UI sulit.
5. Gunakan konfigurasi TLS/SSL seperti disarankan Neon. Contoh susunan URL (BUKAN akaun sebenar): postgresql://USER:PASSWORD@HOST/DB?sslmode=require.
6. Simpan connection string dalam pengurus rahsia; jangan letak dalam source code.

## 2. Tambah DATABASE_URL pada Render
1. Pergi ke https://dashboard.render.com/ dan buka servis hikayat-nusantara-portal.
2. Pilih Environment di sidebar.
3. Pilih + Add Environment Variable.
4. Key: DATABASE_URL. Value: connection string peribadi daripada Neon.
5. Gunakan Save only dahulu untuk menyimpan tetapan tanpa terus menerbitkan versi baru; semak keselamatan serta skema DB sebelum deployment.
6. Pastikan NODE_ENV=production yang diperlukan untuk cookie Secure pada HTTPS.

Dokumentasi rasmi: https://render.com/docs/configure-environment-variables

## 3. Jalankan migrasi pada pangkalan data persendirian
Cara yang ditulis dalam kod semasa memerlukan Node.js 22 dan salinan repositori pada peranti pentadbir:
- npm install
- Tetapkan DATABASE_URL sebagai pembolehubah persekitaran tempatan (jangan simpan ke GitHub).
- npm run db:migrate

Perintah migrasi membaca auth/schema.sql. Migrasi hendaklah dijalankan dengan akaun pangkalan data yang mempunyai kebenaran yang bersesuaian.

## 4. Wujudkan Admin pertama sekali sahaja
Tetapkan pembolehubah persekitaran berikut **secara peribadi** pada peranti pentadbir:
- HN_BOOTSTRAP_ADMIN_ID (ID unik mengikut format kod, cth. HN-ADM-001).
- HN_BOOTSTRAP_ADMIN_PASSWORD (kata laluan rawak sekurang-kurangnya 12 aksara).
- HN_BOOTSTRAP_ADMIN_NAME.
- HN_BOOTSTRAP_ORGANIZATION.
- DATABASE_URL (alamat DB persendirian sama seperti di atas).

Kemudian jalankan:
- npm run auth:bootstrap

Skrip menolak penciptaan jika Admin sudah wujud, untuk mengelakkan bootstrap berulang. Padam pembolehubah bootstrap sementara selepas proses berjaya; jangan letak kata laluan Admin dalam kod atau log.

## 5. Uji akaun dalam persekitaran ujian
- Halaman log masuk: /login.html.
- Admin pertama log masuk dan menukar kata laluan sementara.
- Admin cipta Guru; Guru log masuk, menukar kata laluan dan mencipta kelas.
- Guru cipta Murid; Murid log masuk menggunakan ID dan kata laluan sementara.
- Uji Murid A tidak boleh membuka data Murid B, dan Guru A tidak boleh membuka kelas Guru B.
- Uji checkpoint draf di pelayar/peranti berlainan dan semak konflik versi.

## 6. Jangan gunakan bersama murid sebenar lagi apabila
- Permainan Misi 1–4 belum semuanya mengasingkan storan asal mengikut ID murid.
- Rakaman suara/video belum mempunyai storan persendirian dan izin yang sesuai.
- Backup dan pemulihan DB belum diuji.
- Pentaksiran sebenar masih boleh dikelirukan dengan skor latihan setempat.

PR ujian PostgreSQL memastikan API asas pernah lulus pada pangkalan data sementara GitHub Actions; itu **bukan bukti** pangkalan data Neon peribadi sudah tersambung.

## Rujukan teknikal
- https://neon.com/docs/connect/connect-from-any-app
- https://render.com/docs/configure-environment-variables
