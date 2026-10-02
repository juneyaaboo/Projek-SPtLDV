# 🍳 PjBL SPtLDV — Platform Proyek Berbasis Learning untuk SMK Tata Boga

Aplikasi full-stack untuk mengajarkan **Sistem Pertidaksamaan Linear Dua Variabel (SPtLDV)**
lewat proyek nyata: *"Kombinasi kue apa yang paling menguntungkan untuk kantin sekolah?"*

Seluruh antarmuka berbahasa **Indonesia**, bertema kuliner hangat (oranye/kuning/hijau/krem pastel),
dan dirancang **mobile-first** karena siswa mengaksesnya dari ponsel.

---

## ⚙️ Teknologi

| Bagian | Teknologi |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Cloudflare Workers (TypeScript, Hono) |
| Database | Cloudflare D1 (SQLite) |
| Berkas | Cloudflare R2 (jurnal ≤ 10 MB, portofolio ≤ 50 MB) |
| Grafik | **Custom SVG** buatan sendiri (Fitur 3 & hadiah Fitur 6) — **tanpa GeoGebra** |
| Diagram dasbor | Recharts |
| Ikon | Lucide React |
| Hosting | Cloudflare (1 Worker = API + Static Assets SPA) |

> Struktur cerdas: **kode Worker yang sama** berjalan di produksi (Cloudflare) dan di
> pratinjau lokal (`dev-server.ts` menyediakan shim D1=better-sqlite3 & R2=folder berkas).
> Tidak ada duplikasi logika.

---

## 🚀 Menjalankan di Lokal (pratinjau)

```bash
npm install
npm run seed     # data demo (guru, 2 kelompok, siswa, jurnal, nilai kuis)
npm run dev      # → http://localhost:8787  (API + SPA dalam satu port)
```

Untuk pengembangan frontend dengan hot-reload:

```bash
npm run dev:client   # Vite di :5173, proxy /api → :8787
```

### Akun demo

| Peran | Kredensial |
|---|---|
| 👩‍🏫 Guru | buka `/guru/masuk`, password **`guru123`** |
| 🙋 Siswa (lengkap, Kelompok 1) | nama **`Andi Pratama Wijaya`** + PIN **`1234`** |
| 🙋 Siswa (baru, Kelompok 2) | nama **`Eka Putri Ramadhani`** + PIN **`5678`** |
| 🙋 Siswa (tanpa kelompok) | nama **`Intan Permata`** → pesan "Minta PIN ke gurumu" |

Siswa lain: cukup ketik nama apa pun di `/masuk` (login **tanpa password**).

---

## ☁️ Deploy ke Cloudflare

**Dua cara tersedia:**

1. **🅰️ Tanpa npm sama sekali** (hanya browser + salin-tempel + drag & drop) →
   lihat **[`PANDUAN-DEPLOY-MANUAL.md`](PANDUAN-DEPLOY-MANUAL.md)**.
   Bundel siap-tempel ada di `deploy/worker-bundle.js` (dibuat dengan `npm run bundle`).
2. **🅱️ Dengan Wrangler CLI** (butuh Node.js di komputer):

```bash
npm install
npm run build                                    # hasil → client-dist/

npx wrangler d1 create pjbl-sptldv               # salin database_id ke wrangler.toml
npx wrangler r2 bucket create pjbl-sptldv-files

npx wrangler d1 execute pjbl-sptldv --remote --file=./schema.sql

npx wrangler deploy
```

Setelah online:
1. Buka **`/admin/setup`** → daftarkan guru (nama, kelas, password).
2. Siswa masuk lewat `/masuk` dengan nama lengkap.
3. Guru mengelola kelompok & PIN di `/guru/kelompok`.

Tidak ada langkah migrasi tambahan — `schema.sql` memuat seluruh tabel
(teachers, groups, students, module_progress, quiz_results, interview_data,
inequality_submissions, journals, portfolios, reflections + sessions, notifications, settings).

---

## 🗺️ Rute

| Rute | Isi |
|---|---|
| `/` | Landing (masuk siswa / guru) |
| `/masuk` | Login siswa — **nama saja, tanpa password** |
| `/pin` | Masukkan PIN kelompok 4 digit (3× salah → terkunci 5 menit) |
| `/beranda` | Dasbor siswa: progres "Langkah X dari 10", peta fitur, notifikasi |
| `/fitur/1` | Video cerita masalah (MP4 2 menit) + tabel kendala dapur |
| `/fitur/2` | Modul materi 4 bab (semua contoh bertema kuliner) |
| `/fitur/3` | **Grafik interaktif custom SVG**: slider koefisien, tambah/hapus garis, klik titik pojok, fungsi tujuan Z |
| `/fitur/4` | Kuis 10 soal PG · timer 15 menit · lulus ≥ 70 · jawaban terbuka hanya setelah lulus |
| `/fitur/5` | Form wawancara **fleksibel**: nama produk bebas, bahan dinamis (tambah/hapus), satuan, waktu, untung otomatis |
| `/fitur/6` | **Sistem feedback bertahap** — bukan kalkulator: hanya petunjuk kontekstual, kunci TIDAK pernah dikirim; saat semua benar → hadiah grafik + solusi optimum |
| `/fitur/7` | Jurnal harian (unggah lampiran, kalender hijau/merah, peringatan sebelum 23.59) |
| `/fitur/9` | Portofolio kelompok (6 format, maks 50 MB → R2) |
| `/fitur/10` | Refleksi + grafik perbandingan "Nilai Kuis vs Rating Pemahaman" |
| `/guru/masuk`, `/admin/setup` | Login & pendaftaran guru pertama kali |
| `/guru/dashboard` | **Fitur 8**: kartu ringkasan, tabel per siswa (🟢🟡🔴), kalender jurnal per kelompok, riwayat percobaan model, "Kirim Pengingat", pengaturan periode proyek |
| `/guru/siswa` | Daftar siswa (sudah/belum berkelompok) |
| `/guru/kelompok` | Buat kelompok, **Acak Otomatis**, **drag & drop** manual, PIN otomatis/reset/salin, hapus kelompok |

### Level akses

| Level | Akses |
|---|---|
| Tamu | hanya landing |
| Siswa L1 (nama) | Fitur 1–4 |
| Siswa L2 (nama + PIN) | Fitur 1–10 |
| Guru | semuanya + dasbor monitoring + admin |

---

## 🔒 Aturan penting yang dipenuhi

1. **Semua data di D1/R2** — tidak ada data aplikasi di localStorage (sesi memakai cookie httpOnly).
2. **Fitur 3 grafik custom SVG/Canvas** — nol pustaka grafis eksternal, tanpa GeoGebra.
3. **Fitur 6 tidak pernah membocorkan jawaban** — server membandingkan & hanya mengirim `correct` + `hint`.
4. **Fitur 5 sepenuhnya fleksibel** (produk, bahan, satuan, waktu dapat diubah).
5. **Jurnal harian wajib** — hari kosong = merah "Tidak Ada Kemajuan" + banner pengingat.
6. **Dasbor memantau per individu**, lengkap dengan status 🟢 Lancar / 🟡 Lambat / 🔴 Macet.
7. **Login siswa hanya nama**; **PIN wajib** untuk fitur proyek; lockout 3 percobaan/5 menit.
8. **Seluruh UI Bahasa Indonesia**, mobile-first, target sentuh besar, kontras memadai.
9. **Unggahan → Cloudflare R2** (shim lokal = folder `.data/r2` saat pratinjau).
10. **`wrangler.toml` + `schema.sql` siap deploy** (D1 + R2 + Static Assets SPA).

### Hal kecil yang perlu diketahui

- Tanggal/jam memakai zona **Asia/Jakarta** (batas jurnal 23.59 WIB, kalender, "Hari ke-X").
- Kunci model Fitur 6 dihitung server dari data wawancara terakhir kelompok — bila data
  wawancara diperbarui, percobaan lama dinilai ulang otomatis terhadap kunci baru.
- Parser jawaban siswa toleran: `≤/≤/<=/<`, `≥/>=/>`, `×·*`, spasi, koma desimal,
  pemisah ribuan `10.000`, urutan suku bebas (`150y + 200x`).
- `npm run typecheck` untuk pemeriksaan TypeScript gabungan (client + worker).

---

## 📁 Struktur

```
├── worker/            # Cloudflare Worker (API + logika)
│   ├── index.ts       # seluruh rute /api/*
│   ├── parse.ts       # normalisasi & pemeriksaan jawaban (+hint)
│   ├── lp.ts          # solver daerah layak & titik pojok
│   ├── quiz.ts        # bank 10 soal kuis
│   └── util.ts        # sesi, PBKDF2, tanggal Jakarta
├── src/               # React SPA
│   ├── pages/         # Landing, Masuk, Pin, Beranda, Fitur1–10, guru/*
│   ├── components/    # Layout, Grafik (SVG custom), ui
│   └── lib/lp.ts      # util program linear sisi klien
├── dev-server.ts      # adapter lokal (shim D1/R2) — kode worker sama
├── scripts/seed.ts    # data demo lokal
├── schema.sql         # skema D1
├── wrangler.toml      # konfigurasi Cloudflare
└── public/media/      # ilustrasi & video cerita (dibuat otomatis)
```
