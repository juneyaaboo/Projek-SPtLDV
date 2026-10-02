# 📦 Panduan Deploy MANUAL ke Cloudflare — Tanpa npm / Node.js / Terminal

> **Untuk siapa panduan ini?** Untuk kamu yang tidak ingin (atau tidak bisa) memasang
> Node.js/npm/wrangler di komputer. Semua yang dibutuhkan sudah **disiapkan sebelumnya**
> di folder proyek ini — kamu hanya perlu **browser** (Chrome/Edge/Firefox/Safari),
> **akun Cloudflare gratis**, dan **salin-tempel + seret-unyah berkas**.
>
> ⏱️ Perkiraan waktu: **15–25 menit**. Biaya: **Rp0** (semua di dalam paket gratis Cloudflare).

---

## 🧰 Berkas yang harus diunduh dari workspace ini

Unduh berkas-berkas berikut dari panel berkas workspace (klik berkasnya → tombol unduh),
lalu simpan sementara di komputer/ponselmu dengan **nama yang tidak diubah**:

| # | Berkas di workspace | Kegunaan |
|---|---|---|
| 1 | `pjbl-sptldv/deploy/worker-bundle.js` | **Kode aplikasi siap-tempel** (sudah digabung & dimampatkan — jangan diedit) |
| 2 | `pjbl-sptldv/schema.sql` | Skema database (ditempel ke konsol D1) |
| 3 | `pjbl-sptldv/client-dist/index.html` | Halaman utama aplikasi |
| 4 | `pjbl-sptldv/client-dist/assets/index-xxxx.js` dan `index-xxxx.css` | Kode tampilan (nama berisi angka acak — ikutkan apa adanya) |
| 5 | `pjbl-sptldv/client-dist/media/cerita.mp4` | Video cerita masalah Fitur 1 *(disarankan)* |
| 6 | `pjbl-sptldv/client-dist/media/hero.jpg` dan `scene1.jpg` … `scene6.jpg` | Ilustrasi landing page & video *(disarankan)* |

> 💡 Nomor 5–6 opsional: tanpa itu aplikasi tetap jalan, hanya video & gambar yang kosong.
> Total ukuran ± 19 MB.

---

## 🗺️ Gambaran besar (apa yang akan kita buat)

| Komponen di Cloudflare | Nama yang kita pakai | Isi |
|---|---|---|
| **D1** (database) | `pjbl-sptldv` | 13 tabel: siswa, kelompok, PIN, nilai kuis, jurnal, dll. |
| **R2** (penyimpanan berkas) | `pjbl-sptldv-files` | Unggahan siswa: lampiran jurnal & portofolio |
| **R2** (berkas web) | `pjbl-sptldv-web` | HTML/JS/CSS/video hasil build (antarmuka aplikasi) |
| **Worker** | `pjbl-sptldv-api` | Otak aplikasi: API + penyaji halaman web |

---

## LANGKAH 1 — Membuat Database (D1)

1. Buka **https://dash.cloudflare.com** → masuk/log in.
2. Menu kiri: **Storage & Databases** → **D1 SQL Database** → tombol **Create Database**
   (kalau ada pilihan lokasi, biarkan *Auto*).
3. Database name: `pjbl-sptldv` → **Create**.
4. Setelah dibuka, pilih tab **Console**.
5. Buka berkas `schema.sql` yang tadi diunduh dengan **Notepad/Text editor** → **salin seluruh isinya**
   → tempel ke kotak konsol → klik **Run** ✅.
   > ⚠️ **Pastikan mengunduh ulang `schema.sql` versi terbaru dari workspace**
   > (versi lama bisa memunculkan error `no such table: main.interview_data`).
6. Harus muncul pesan sukses.

**Verifikasi** — tempel query ini, klik Run:

```sql
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
```

Harus muncul **13 tabel**: `groups`, `inequality_submissions`, `interview_data`, `journals`,
`module_progress`, `notifications`, `portfolios`, `quiz_results`, `reflections`, `sessions`,
`settings`, `students`, `teachers`.

> 🆘 **Kalau masih error / hanya sebagian yang jalan:** konsol D1 kadang rewel menjalankan
> banyak pernyataan sekaligus. Solusinya, jalankan **bertahap** memakai dua berkas kecil
> yang sudah disiapkan (ada di folder `pjbl-sptldv/deploy/sql/`):
> 1. Tempel **`1-tabel.sql`** → Run → pastikan sukses.
> 2. Tempel **`2-indeks.sql`** → Run → pastikan sukses.
> 3. Verifikasi lagi dengan query di atas.
>
> Semua pernyataan memakai `IF NOT EXISTS`, jadi **aman dijalankan berulang** — data yang
> sudah ada tidak akan terhapus.

> ✏️ Catat nama databasenya; nanti dipilih lagi di Langkah 5.

---

## LANGKAH 2 — Bucket R2 untuk unggahan siswa

1. Menu kiri: **R2 Object Storage**. (Pertama kali mungkin diminta menyetujui syarat R2 — setujui; R2 punya kuota gratis 10 GB.)
2. **Create bucket** → name: `pjbl-sptldv-files` → lokasi *Auto* → **Create bucket**.
3. Selesai — **tidak perlu isi apa-apa** di dalamnya. Bucket ini otomatis terisi saat siswa
   mengunggah lampiran jurnal (maks 10 MB) dan portofolio (maks 50 MB).

---

## LANGKAH 3 — Bucket R2 untuk halaman web + unggah berkas tampilan

1. Masih di **R2** → **Create bucket** → name: `pjbl-sptldv-web` → **Create bucket**.
2. Buka bucket `pjbl-sptldv-web` → tombol **Upload**.
3. **Seret / pilih semua berkas** yang tadi diunduh dari `client-dist`:
   `index.html`, berkas `.js` dan `.css` di folder `assets`, dan semua berkas di folder `media`.
   - Kalau diminta memilih "file / folder", pilih **semua berkas sekaligus**.
   - **Jangan mengubah nama berkas apa pun** (nama berisi angka acak seperti
     `index-T7P154lr.js` memang begitu adanya).
4. Tunggu unggahan selesai. Nanti isi bucket bisa tampak rata (tanpa folder) — **tidak masalah**,
   kode aplikasi otomatis mencari berkas baik dengan struktur folder maupun rata.
   Yang penting: **`index.html` ada di bucket** dan nama semua berkas **persis sama** dengan aslinya.

---

## LANGKAH 4 — Membuat Worker & menempel kode aplikasi

1. Menu kiri: **Workers & Pages** → **Create application** → **Workers** → **Start with Hello World!**
   (atau tombol "Hello World" / "Hello world example").
2. Name: `pjbl-sptldv-api` → klik **Deploy**.
3. Setelah selesai, klik **Edit code** (Edit code / kode editor).
4. **Hapus semua** kode bawaan di editor, lalu **tempel seluruh isi** berkas
   `deploy/worker-bundle.js` (buka dengan Notepad → Ctrl+A → Ctrl+C → tempel di editor Cloudflare).
5. Klik **Deploy** (kanan atas) → konfirmasi.
6. Biarkan pengaturan lain apa adanya (compatibility date bawaan sudah cocok).

> Sementara halaman masih menampilkan "Hello World" — normal, karena database & penyimpanan
> belum terhubung. Itu tugas Langkah 5. 👇

---

## LANGKAH 5 — Menghubungkan Database & Penyimpanan (Bindings)

1. Buka Worker `pjbl-sptldv-api` → tab **Settings** → cari bagian **Bindings** → **Add binding**.
2. Tambahkan **tiga** binding ini satu per satu (nama variabel harus **persis sama**):

| Jenis binding (pilih di dropdown) | Variable name | Pilih / isi |
|---|---|---|
| **D1 database** | `DB` | database **pjbl-sptldv** |
| **R2 bucket** | `R2` | bucket **pjbl-sptldv-files** |
| **R2 bucket** | `WEB` | bucket **pjbl-sptldv-web** |

3. Simpan setiap binding. Kalau halaman aplikasi belum berubah, klik **Deploy** sekali lagi.

---

## LANGKAH 6 — Uji coba & pengaturan pertama

Buka alamat aplikasi: **`https://pjbl-sptldv-api.<subdomain-kamu>.workers.dev`**
(alamat lengkapnya terlihat di halaman Worker, tombol *Visit*).

✅ **Checklist cepat:**

| Uji | Hasil yang benar |
|---|---|
| Buka alamat utama | Landing page oranye "PjBL SPtLDV" 🍳 |
| Buka `/guru/masuk` | Muncul "Belum ada guru terdaftar" + tombol setup |
| Buka `/admin/setup` | Form pendaftaran guru |

**Urutan setup pertama:**

1. **`/admin/setup`** → isi nama guru, kelas, password (min. 6 karakter) → *Daftarkan Guru*.
   Kamu otomatis masuk ke **dashboard guru**.
2. Menu **Kelompok & PIN** → masukkan nama siswa lewat halaman `/masuk` dulu (cukup nama,
   tanpa password) supaya terdaftar, lalu di **Kelompok & PIN** klik **🎲 Acak Otomatis**
   (default 4 siswa/kelompok) atau susun manual dengan seret-sisip. **PIN 4 angka dibuat otomatis**
   — salin & bagikan ke tiap kelompok.
3. Siswa: buka `/masuk` → tulis nama lengkap → masukkan PIN kelompok → semua fitur 1–10 terbuka.

---

## 🔄 Memperbarui aplikasi di kemudian hari

- **Tampilan (frontend)**: unggah ulang isi `client-dist` terbaru ke bucket `pjbl-sptldv-web`
  (berkas lama boleh dihapus dulu supaya rapi).
- **Logika (API)**: tempel ulang `deploy/worker-bundle.js` terbaru di editor Worker → Deploy.
  **Binding tidak perlu diatur ulang.**
- **Data**: aman — tidak tersentuh oleh pembaruan kode.

---

## 🆘 Masalah umum & solusinya

| Gejala | Penyebab & solusi |
|---|---|
| `no such table: main.interview_data` (atau tabel lain) saat Run schema | Eksekusi terpecah — tabel belum dibuat tetapi indeks sudah dijalankan. **Unduh ulang `schema.sql` terbaru** (struktur sudah diperbaiki: indeks menempel di tabelnya), jalankan lagi — aman diulang. Bila tetap gagal, jalankan `deploy/sql/1-tabel.sql` lalu `deploy/sql/2-indeks.sql`. |
| Masih muncul "Hello World" | Kode belum ditempel / belum klik **Deploy** setelah menempel. |
| Error `1101` saat membuka alamat | Binding belum dipasang atau nama variabel salah — harus persis `DB`, `R2`, `WEB` (huruf besar). |
| "Belum ada guru terdaftar" terus-menerus | Skema `schema.sql` belum dijalankan — ulangi Langkah 1 langkah 4–6. |
| Halaman putih / polos | `index.html` tidak ada di bucket `pjbl-sptldv-web`, atau ada berkas yang namanya berubah. Unggah ulang semua isi `client-dist` tanpa mengganti nama. |
| Video/gambar tidak muncul | Berkas di folder `media` belum terunggah ke bucket web. |
| Lupa password guru | Buka D1 `pjbl-sptldv` → Console → jalankan `DELETE FROM teachers;` → buka `/admin/setup` untuk mendaftar ulang. |
| PIN siswa ditolak | Cek daftar PIN di `/guru/kelompok`; 3× salah → akun terkunci 5 menit (memang disengaja). |
| Unggah portofolio gagal | Maksimum 50 MB per berkas. |
| Video lama tersimpan tapi tak putar | Pastikan `media/cerita.mp4` terunggah **utuh** (ukuran ± 8,7 MB). |

---

## 🔐 Catatan keamanan & batasan

- Password guru disimpan **ter-hash (PBKDF2)**; sesi login memakai cookie `httpOnly` — aman standar sekolah.
- Batas paket gratis (cukup untuk 1–2 kelas): D1 ± 5 GB, R2 ± 10 GB, Worker ± 100 ribu permintaan/hari.
- Untuk domain sendiri (mis. `sptldv.sekolah.sch.id`): Worker → **Settings → Domains & Routes → Add Custom Domain** (domain harus sudah aktif di Cloudflare).
- Cadangan data: berkala buka D1 → Console → `SELECT * FROM journals;` dst., atau gunakan
  `wrangler d1 export` jika suatu saat ada komputer dengan Node.js.

---

## 🛤️ Alternatif (kalau suatu saat berubah pikiran)

| Metode | Butuh npm? | Rujukan |
|---|---|---|
| **Manual dashboard** (panduan ini) | ❌ Tidak | dokumen ini |
| **Wrangler CLI** — `npm run deploy` | ✅ Ya | `README.md` bagian "Deploy ke Cloudflare" |
| **GitHub + Workers Builds** — hubungkan repo, Cloudflare yang membangun & memasang otomatis | ❌ Tidak (di komputermu) | Cloudflare Dashboard → Workers → *Connect to Git* |

> Selamat mengajar! Kalau ada langkah yang melewati UI Cloudflare yang berubah tampilan,
> intinya tetap sama: **buat D1 + 2 bucket R2 + 1 Worker, tempel bundle, pasang 3 binding.** 🚀
