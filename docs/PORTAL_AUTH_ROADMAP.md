# Hikayat Nusantara — Pelan Akaun, Data dan Dashboard

> **Fasa 1: reka bentuk sahaja.** Login, pendaftaran guru/murid, rekod rentas peranti dan penghantaran rasmi masih **belum aktif**. Jangan mengumpul kata laluan atau data sebenar melalui prototaip.

## Keputusan reka bentuk
- **Dashboard Murid:** kekal tanpa perubahan UI, termasuk Desa Hikayat 3D dan Misi 1–4.
- **Dashboard Guru:** ringkas dan bersidebar (modul semasa `teacher-dashboard.js`). Admin akan mencipta akaun guru; guru akan mencipta akaun murid, kelas dan tugasan.
- **Dashboard Admin:** ringkas dan bersidebar; pengurusan sekolah/guru/kelas, audit, laporan, status media dan sandaran.
- **Halaman log masuk:** satu halaman dengan pilihan Murid/Guru/Admin; akaun disahkan **oleh backend**, bukan pilihan tab. Fasa 1 menyediakan `/login-preview.html` dengan semua input kelayakan tidak aktif supaya tidak memberi tanggapan keselamatan palsu.

## Aliran akaun (Fasa backend)
1. Akaun Admin pertama diwujudkan melalui proses bootstrap yang selamat dan sekali sahaja; tiada kata laluan tetap dalam kod.
2. Admin mencipta akaun Guru dengan ID unik dan kelayakan sementara yang dijana selamat, kemudian memberikan hak akses mengikut organisasi/sekolah.
3. Guru mencipta kelas sendiri serta akaun murid; kata laluan sementara dipaparkan sekali sahaja melalui saluran yang dibenarkan, dan tidak boleh dibaca semula.
4. Murid log masuk, ditetapkan pada kelas, dan hanya boleh melihat pembelajaran sendiri.
5. Semua route dashboard dan API mestilah dilindungi **di server**. Menyembunyikan HTML, mengubah hash atau menyekat butang tidak mencukupi untuk autentikasi.
6. Kata laluan disimpan sebagai hash yang sesuai (contohnya Argon2id); sesi menggunakan cookie HttpOnly/Secure/SameSite dan perlindungan CSRF jika menggunakan cookie.

## Organisasi dan sempadan data
Satu servis boleh menyokong banyak sekolah. Jadual akan membawa `organization_id` dan/atau hubungan scoped:
- `organizations`, `users`, `teacher_profiles`, `student_profiles`
- `classes`, `teacher_class_assignments`, `class_memberships`
- `assignments`, `mission_attempts`, `mission_progress`, `mission_events`
- `submissions`, `feedback`, `pbd_assessments`
- `announcements`, `reward_records`, `certificate_records`
- `media_assets`, `audit_logs`, `session_records`

Semua query mesti memeriksa organisasi, peranan, dan keahlian kelas **di backend**. Guru tidak boleh memilih ID kelas lain untuk membaca data orang lain. Super Admin hanya mendapat akses pentadbiran yang diperlukan; akses kandungan murid perlu dihadkan dan diaudit.

## Kontrak API cadangan (belum diimplementasi)
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`
- `POST /api/admin/teachers`, `GET /api/admin/teachers`, `PATCH /api/admin/teachers/:id`
- `POST /api/teacher/classes`, `GET /api/teacher/classes`
- `POST /api/teacher/students`, `GET /api/teacher/students`, `POST /api/teacher/students/:id/reset-credential`
- `GET /api/student/overview`, `GET /api/student/missions/:missionId/progress`
- `PUT /api/student/missions/:missionId/checkpoint` (versioned, idempotent)
- `POST /api/student/missions/:missionId/attempts`
- `POST /api/student/submissions`, `GET /api/teacher/submissions`, `POST /api/teacher/submissions/:id/feedback`
- `POST /api/media/upload-intent`, `POST /api/media/complete` untuk media persendirian
- `GET /api/admin/audit` untuk rekod audit berpenapis, selaras dengan kebenaran

Permintaan perlu melalui pengesahan input, pengasingan organisasi, rate limit, pengecaman idempotensi, dan semakan pemilikan rekod.

## Sambung Pengembaraan
- Perubahan teks/checkpoint disimpan sementara pada peranti dalam IndexedDB; autosave ke backend apabila terdapat sambungan.
- Backend menyimpan `student_id`, `mission_id`, `checkpoint`, `attempt_id`, `version`, `updated_at` dan status.
- Pemulihan apabila log masuk semula memuatkan **rekod terakhir yang disahkan oleh server**, kemudian mendamaikan draf setempat jika masih ada.
- Pengguna melihat “Disimpan ke pelayan”, “Sedang menyelaraskan” atau “Belum diselaraskan” berdasarkan respons sebenar.
- Permintaan berkembar tidak boleh menggandakan percubaan/XP/penghantaran. Gunakan kunci idempotensi serta nombor versi untuk mengelak data ditindih.
- Rekod `postMessage` daripada iframe permainan ialah isyarat dari klien dan **bukan bukti rasmi** penyelesaian/penyerahan. Backend perlu mengesahkan peristiwa dan penghantaran.
- Misi yang telah disahkan selesai kekal selesai semasa berpindah peranti. Jangan memaksa murid mengulang kecuali guru memberikan aktiviti baharu.

## Kamera, mikrofon dan fail
- Misi 4 menggunakan izin eksplisit pelayar melalui HTTPS; tidak memulakan rakaman secara senyap.
- Semak sokongan kamera/mikrofon dan `MediaRecorder`, termasuk mesej ralat serta pilihan rakaman audio sahaja.
- Mulakan, hentikan, pratonton dan simpan ke peranti sebelum penghantaran.
- Jangan hidupkan API `/api/misi4/*` secara palsu. Penghantaran rasmi hanya selepas autentikasi + storan objek persendirian + resit pelayan.
- Jangan gunakan storan sementara Render sebagai arkib rakaman murid. Gunakan objek storan persendirian, had saiz, retention policy dan pautan sementara berautoriti.
- Kandungan media murid hanya boleh diakses oleh pihak yang diberi kebenaran; urus persetujuan/peraturan institusi.

## Audit, statistik dan privasi
- Rekod `actor_id`, `organization_id`, `action`, `resource_type`, `resource_id`, `timestamp`, `outcome`, `request_id`.
- Log masuk, cipta kelas, cipta akaun, ubah keahlian, semakan, penghantaran serta pemulihan direkodkan.
- Jangan log kata laluan, token sesi, video/audio mentah, atau kandungan karya yang tidak perlu.
- Dashboard Admin menggunakan statistik agregat, bukan memaparkan semua data peribadi secara lalai.
- Pelan sandaran perlu diuji dengan pemulihan; paparan tidak boleh mendakwa sandaran berjaya sebelum benar-benar disahkan.

## Kriteria Fasa 1
- 13 menu Admin boleh ditukar tanpa tab bertindih.
- Rekaan Guru kekal ringkas; Dashboard Murid dan empat iframe misi tidak diubah.
- Pratonton log masuk jelas belum aktif dan **tidak mengumpul** ID atau kata laluan.
- Build memasukkan semua fail baharu dan Node server boleh menghidangkannya.
- Ujian statik berkenaan laluan/menu disediakan.
- Tiada commit ke `main`, tiada deploy ke Render sehingga penyepaduan yang selamat dirancang dan disemak.

## Langkah selepas Fasa 1
1. Pilih backend data kekal (PostgreSQL/Neon/Render Postgres) serta dasar sandaran.
2. Implementasikan autentikasi dan bootstrap Admin yang selamat.
3. Aktifkan cipta Guru → cipta Kelas/Murid dengan ID unik.
4. Sambungkan empat misi kepada checkpoint dan percubaan yang disahkan.
5. Tambah semakan guru, PBD, audit dan laporan.
6. Hidupkan storan media dan resit penghantaran rasmi Misi 4.
7. Uji peranan silang sekolah, penggunaan serentak, log masuk semula dan sambungan rangkaian terputus.
