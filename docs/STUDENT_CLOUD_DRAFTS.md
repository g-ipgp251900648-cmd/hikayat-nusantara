# Sambung Pengembaraan — Autosave Draf Dashboard Murid

## Fungsi branch ini
- Draf latihan Dashboard Murid disimpan dahulu pada pelayar bagi setiap ID murid.
- Misi 1–4 menggunakan rekod draf berasingan pada endpoint `PUT /api/student/progress/:missionId`.
- Selepas pelayan mengesahkan penyimpanan, nombor versi disimpan; draf boleh dipulihkan apabila murid log masuk menggunakan peranti lain yang tiada draf setempat.
- Jika murid terputus Internet, perubahan disimpan dalam outbox setempat dan dicuba semula apabila sambungan tersedia.
- Jika peranti mempunyai draf berbeza daripada versi pelayan, sistem mengekalkan draf setempat dan tidak menindih kerja secara senyap.
- Semakan Guru memaparkan rekod checkpoint **Draf**, bukan markah akhir atau pentaksiran rasmi.

## Status dan batasan
- **PR ini belum sesuai untuk data murid sebenar.**
- Penyelarasan ini meliputi latihan HTML pada Dashboard Murid. Misi asal Google AI Studio dalam iframe menggunakan storan dalaman tersendiri; setiap misi perlu diintegrasikan dengan identiti akaun dan checkpoint sebelum penggunaan pada komputer yang dikongsi.
- Sesetengah interaksi asal Misi 1–4 belum dimuat naik ke backend. Rakaman Misi 4 masih hanya boleh disimpan setempat; penghantaran kepada Guru memerlukan storan objek persendirian.
- Jurnal Pusat Pembelajaran masih disimpan pada peranti.
- PBD, sijil dan pengesahan guru tidak diperoleh secara automatik daripada data draf.
- Penggabungan beberapa draf yang bercanggah memerlukan aliran semakan pengguna/guru; draf sengaja dikekalkan apabila timbul konflik.
- Perlukan PostgreSQL, akaun sah, backup dan ujian privasi institusi sebelum deployment.

## Pengesahan
- Ujian unit meliputi checkpoint tersimpan ke pelayan, pemulihan pada peranti baharu, storan tertangguh ketika offline dan konflik versi.
- Ujian PostgreSQL HTTP berasingan dalam GitHub Actions memeriksa akaun, pemisahan kelas serta operasi checkpoint.
- Jangan tukar status "draf" kepada "selesai" sehingga event permainan ditentusahkan oleh backend dan guru.
