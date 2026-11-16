# Whiteout: Roadmap 28 Hari

Dokumen kerja untuk lo sendiri, jadi bahasanya santai. Hari ini Senin 16 November 2026. Deadline resmi **14 Desember 2026 pukul 23:59 AOE**, yang sama dengan **Selasa 15 Desember 2026 pukul 19:59 WITA**. Jangan mengandalkan jam terakhir. Target submit **Jumat 11 Desember**, sisanya buffer.

## Prinsip kerja

1. **Spike dulu, bangun kemudian.** Risiko terbesar proyek ini ada di tiga tempat: HCU per langkah, latensi decrypt di Sepolia, dan encoding public decrypt. Semuanya dicek di 3 hari pertama, sebelum menulis UI sama sekali.
2. **Engine dulu, UI kemudian.** Kontrak yang lolos tes differential lebih berharga daripada UI cantik di atas engine yang rapuh.
3. **Demo-driven.** Tiap minggu harus ada sesuatu yang bisa direkam.
4. **Potong tanpa ragu.** Daftar potongan ada di bagian bawah.

## Gate keputusan (jangan dilewati)

| Tanggal | Gate | Kalau gagal |
| --- | --- | --- |
| Rabu 18 Nov | Satu `move` jalan di mock, HCU terukur di bawah budget, kompilasi bersih | Sederhanakan: buang path packing atau signal Glint, ukur ulang |
| Jumat 20 Nov | Satu langkah penuh jalan di Sepolia (tx plus user decrypt) | Kalau latensi tidak tertahankan atau relayer tidak stabil, **pindah ke Blind Throne** (rencana cadangan, lihat bawah) |
| Jumat 27 Nov | Satu run penuh di Sepolia termasuk finalize | Potong semua stretch goal, fokus stabilitas |
| Jumat 4 Des | Frontend bisa dimainkan dari awal sampai replay | Potong replay animasi, pakai tampilan statis |

## Minggu 1: Senin 16 sampai Minggu 22 Nov (engine)

**Hari 1 sampai 2 (16 sampai 17 Nov): spike**
- Clone `fhevm-hardhat-template`, pin versi yang dipakai template, jalankan contoh bawaan sampai hijau.
- Tulis `Whiteout.sol` minimal: `startRun` dan satu `move`.
- Jawab pertanyaan terbuka di `ARCHITECTURE.md` bagian 10, terutama nomor 1, 2 dan 4.
- Cek apakah repo kompetitor di Season 5 sudah ada yang mirip (cari "Zama Season 5" di GitHub dan community.zama.org). Ulangi tiap Senin.

**Hari 3 (18 Nov): gate pertama**
- `move` lengkap dengan alive gating, treasure, dan signal.
- Ukur HCU nyata, catat di `ARCHITECTURE.md`.

**Hari 4 sampai 5 (19 sampai 20 Nov)**
- `reference.ts` dan harness fixed-map.
- Tes unit 1 sampai 13 dan tes differential.
- Deploy ke Sepolia, satu langkah via hardhat task, ukur latensi user decrypt. **Gate kedua.**

**Hari 6 sampai 7 (21 sampai 22 Nov)**
- `finish`, `finalize`, `prizesInitial`, path packing, tes 14 sampai 20.
- Tes confidentiality C1 sampai C7.
- Tes randomness 500 map di mock.

## Minggu 2: 23 sampai 29 Nov (run penuh di Sepolia dan UI dasar)

- Senin 23: deploy ulang, jalankan satu run penuh via script (start, 10 langkah, kembali ke kabin, finish, finalize). Catat tx hash.
- Selasa 24 sampai Rabu 25: scaffold Next.js, koneksi wallet, cek jaringan Sepolia, integrasi relayer SDK (client only, `dynamic` tanpa SSR). Cek apakah butuh header cross-origin isolation.
- Kamis 26 sampai Jumat 27: papan 8x8 dengan kabut, D-pad dan keyboard, loop `move` plus user decrypt, panel sinyal. **Gate ketiga.**
- Sabtu 28 sampai Minggu 29: prediksi posisi lokal, antrean input, state "decrypting" yang jelas, tes dua wallet.

## Minggu 3: 30 Nov sampai 6 Des (polish dan fitur pembeda)

- Senin 30 sampai Selasa 1: layar Finish dan reveal (kabut terangkat), fetch public decrypt, panggil `finalize`.
- Rabu 2: **replay viewer** dari path yang terbuka. Ini aset demo terkuat.
- Kamis 3: toggle **Chain view vs Your view** (tampilan explorer berisi handle buram vs tampilan pemain).
- Jumat 4: leaderboard dari event `RunFinalized`. **Gate keempat.**
- Sabtu 5 sampai Minggu 6: simulator balance (`sim/`), tuning kepadatan pit, treasure dan jumlah langkah. Playtest dengan 3 sampai 5 orang dan catat di mana mereka bingung.

## Minggu 4: 7 sampai 11 Des (docs, video, submit)

- Senin 7: bekukan fitur. Hanya bug fix setelah ini.
- Selasa 8: README final, `ARCHITECTURE.md` diperbarui dengan angka HCU nyata, rapikan kode, jalankan seluruh tes.
- Rabu 9: seed beberapa run di Sepolia (satu sempurna, satu mati, satu timeout) agar leaderboard dan replay terisi. Deploy frontend ke Vercel. Verifikasi kontrak di Etherscan.
- Kamis 10: rekam video (lihat `DEMO_AND_SUBMISSION.md`), post X.
- Jumat 11: **SUBMIT.** Isi form, cek ulang semua link dari jendela incognito.

## Buffer: 12 sampai 14 Des

Hanya untuk darurat: form error, video perlu rekam ulang, bug fatal. Jangan merencanakan fitur di sini.

## Daftar potongan (urutan dibuang saat waktu mepet)

1. Daily mode, cUSDT, queued moves (memang stretch, tidak masuk jadwal di atas)
2. Animasi replay (ganti tampilan statis)
3. Leaderboard (ganti daftar run milik wallet sendiri)
4. Sinyal Glint (pertahankan Cold saja)
5. Path packing dan replay (pertahankan reveal peta saja)

Jangan pernah potong: tes differential, ACL yang benar, finalize dengan proof, dokumentasi, video.

## Rencana cadangan: Blind Throne

Dipicu kalau gate kedua gagal. Colonel Blotto raja-bukit: raja menyimpan alokasi 100 pasukan ke 4 medan sebagai angka terenkripsi, penantang mengirim alokasi terenkripsi, kontrak membandingkan per medan dan hanya membuka siapa yang menang. Bisa jadi dalam sekitar 7 hari dari nol karena operasinya hanya perbandingan dan penjumlahan. Kelemahannya sudah dibahas: kurang unsur acak dan perlu penjelasan aturan. Putuskan di gate kedua, jangan di minggu ketiga.

## Risiko dan mitigasi

| Risiko | Kemungkinan | Mitigasi |
| --- | --- | --- |
| HCU `move` terlalu besar | Rendah sampai sedang | Estimasi 1,78 juta per langkah dari tabel docs. Ukur di hari 3, potong neighbor atau path kalau perlu |
| Latensi decrypt tinggi bikin game terasa mati | Sedang | Prediksi posisi lokal, input diantre, state loading jelas |
| Relayer atau Sepolia tidak stabil saat rekam video | Sedang | Rekam lebih awal, simpan run seed, siapkan rekaman cadangan |
| Pesaing mengambil konsep fog of war | Sedang | Cek tiap Senin. Pembeda ada di "mati itu privat", replay, dan toggle chain view |
| Versi library berubah di tengah jalan | Sedang | Pin versi dari template, jangan upgrade setelah Hari 3 |
| Burnout solo | Sedang | Hari Minggu boleh ringan, gate di jadwal sudah memaksa potong lebih awal |

## Checklist harian singkat

- Tes hijau sebelum commit.
- Satu commit bermakna per sesi kerja.
- Catat angka nyata (HCU, latensi, gas) di `ARCHITECTURE.md` saat didapat, jangan menunggu akhir.
