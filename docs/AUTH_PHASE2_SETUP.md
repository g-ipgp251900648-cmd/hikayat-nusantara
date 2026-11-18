# Fasa 2 — Akaun sebenar Hikayat Nusantara

STATUS: BRANCH PEMBANGUNAN. JANGAN GUNA DATA MURID SEBENAR ATAU DEPLOY SEBELUM UJIAN PRIVASI LENGKAP.

## Aliran akaun
1. Admin pertama dicipta sekali sahaja menggunakan skrip bootstrap dan rahsia persekitaran pelayan.
2. Admin log masuk, menukar kata laluan sementara, kemudian mencipta akaun Guru.
3. Guru log masuk, menukar kata laluan sementara, kemudian mencipta kelas dan akaun Murid.
4. Murid menggunakan ID serta kata laluan yang diberikan Guru dan menukarnya pada log masuk pertama.
5. Tiada ID/kata laluan rahsia tetap dalam kod; hanya hash kata laluan disimpan di pangkalan data.

## Persediaan persekitaran
1. Sediakan PostgreSQL persendirian dan tetapkan DATABASE_URL pada Render Environment (JANGAN simpan dalam GitHub).
2. Jalankan npm install dan npm run db:migrate dalam persekitaran persendirian yang mempunyai akses DB.
3. Untuk akaun pertama sahaja, tetapkan HN_BOOTSTRAP_ADMIN_ID, HN_BOOTSTRAP_ADMIN_PASSWORD, HN_BOOTSTRAP_ADMIN_NAME dan HN_BOOTSTRAP_ORGANIZATION. Kata laluan mesti 12 aksara atau lebih dan unik.
4. Jalankan npm run auth:bootstrap tepat sekali. Padam pembolehubah bootstrap selepas penciptaan akaun.
5. Jalankan npm run check, npm test dan npm run build. Pastikan NODE_ENV=production dan HTTPS berfungsi.
6. Uji kebenaran semua peranan, pemulihan sesi, sambungan terputus dan pemisahan organisasi/kelas sebelum production.

Jangan kongsikan kata laluan atau DATABASE_URL melalui chat.

## API tersedia
- Status/sesi/log masuk: GET /api/auth/status; GET /api/auth/session; POST /api/auth/login; POST /api/auth/logout; POST /api/auth/change-password.
- Admin: GET/POST /api/admin/teachers; GET /api/admin/overview.
- Guru: GET/POST /api/teacher/classes; GET/POST /api/teacher/students; GET /api/teacher/overview.
- Murid: GET /api/student/progress; PUT /api/student/progress/:missionId (rekod DRAF sahaja).
- Misi 1–4 memerlukan sesi Murid sah sebelum fail permainan dihidangkan.

## Batasan dan perkara mesti disiapkan sebelum produksi
- Empat permainan asal masih menggunakan mekanisme storan masing-masing di dalam iframe. Audit dan asingkan storan setiap permainan mengikut akaun Murid sebelum penggunaan pada komputer yang dikongsi.
- Storan latihan utama Dashboard Murid dan jurnal telah diasingkan mengikut ID akaun. Rekod anonim lama hanya boleh diimport selepas pengguna sendiri mengesahkan pemilikan; jangan import automatik.
- API checkpoint telah tersedia tetapi kemajuan keempat-empat permainan belum diselaraskan sepenuhnya dengan API tersebut. Belum ada jaminan kesinambungan merentas peranti.
- Upload Misi 4 masih ditutup sehingga tersedia storan fail persendirian, kebenaran murid dan resit backend.
- Bootstrap pertama kini mewujudkan satu organisasi sahaja; onboarding pelbagai sekolah memerlukan modul tambahan.
- Set semula kata laluan, pengurusan kelas lanjutan, PBD, laporan, log audit menyeluruh, sandaran dan pemulihan belum lengkap.
- Had kadar log masuk berdasarkan IP kini dalam memori proses; infrastruktur besar memerlukan perlindungan merentas instance.
- Uji kerahsiaan rakaman, perlindungan data peribadi murid, izin penjaga/institusi jika perlu serta pengarkiban/pemadaman.

## Senarai ujian keselamatan
- Guru tidak boleh cipta akaun Guru; hanya Admin boleh.
- Guru A tidak boleh mengakses kelas atau murid Guru B.
- Murid A tidak boleh melihat rekod Murid B, termasuk ketika bertukar akaun dalam pelayar sama.
- Akses URL terus kepada dashboard dan keempat-empat misi disekat tanpa sesi sah.
- Kata laluan sementara wajib ditukar dahulu.
- Tidak ada kata laluan/token dalam log pelayan.
- Versi checkpoint berlainan menghasilkan konflik dan tidak menindih kerja terkini secara senyap.
- Aktiviti permainan tidak secara automatik dijadikan evidens pentaksiran rasmi.
- Rakaman hanya dihantar selepas server mengesahkan fail berjaya diterima.

Jangan gabungkan PR ini ke branch main sehingga pemeriksaan produksi selesai.
