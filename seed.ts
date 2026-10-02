// =============================================================
// Data demo untuk pratinjau lokal (`npm run seed`).
// Hanya berlaku untuk database lokal (.data/dev.sqlite3).
// Di Cloudflare: guru mendaftar sendiri lewat /admin/setup.
// =============================================================
import Database from 'better-sqlite3'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pbkdf2Sync, randomBytes } from 'node:crypto'

const DATA_DIR = join(process.cwd(), '.data')
const DB_PATH = join(DATA_DIR, 'dev.sqlite3')
mkdirSync(DATA_DIR, { recursive: true })
const db = new Database(DB_PATH)

// terapkan skema (aman dijalankan berulang)
const schema = readFileSync(join(process.cwd(), 'schema.sql'), 'utf8')
db.exec(schema)

function hash(pw: string): string {
  const salt = randomBytes(16)
  const h = pbkdf2Sync(pw, salt, 100000, 32, 'sha256')
  return `pbkdf2$100000$${salt.toString('base64')}$${h.toString('base64')}`
}

const today = new Date()
const d = (offset: number) => {
  const t = new Date(today.getTime() + offset * 86400000)
  return t.toISOString().slice(0, 19).replace('T', ' ')
}

// ---- reset ----
db.exec(`
  DELETE FROM reflections; DELETE FROM portfolios; DELETE FROM journals;
  DELETE FROM inequality_submissions; DELETE FROM interview_data;
  DELETE FROM quiz_results; DELETE FROM module_progress;
  DELETE FROM notifications; DELETE FROM sessions; DELETE FROM settings;
  UPDATE students SET group_id = NULL, pin_entered = 0;
  DELETE FROM groups; DELETE FROM students; DELETE FROM teachers;
`)

// ---- guru demo ----
db.prepare('INSERT INTO teachers (name, password_hash, class_name, created_at) VALUES (?,?,?,?)').run(
  'Bu Sari Wijaya',
  hash('guru123'),
  'X Tata Boga 1',
  d(-12),
)

// ---- kelompok ----
const g1 = db.prepare('INSERT INTO groups (name, pin, created_at) VALUES (?,?,?)').run('Kelompok 1', '1234', d(-11)).lastInsertRowid
const g2 = db.prepare('INSERT INTO groups (name, pin, created_at) VALUES (?,?,?)').run('Kelompok 2', '5678', d(-11)).lastInsertRowid

// ---- siswa ----
const k1 = ['Andi Pratama Wijaya', 'Bella Kusuma', 'Citra Ayu Lestari', 'Dimas Saputra']
const k2 = ['Eka Putri Ramadhani', 'Fajar Nugroho', 'Gita Hapsari', 'Hendra Wijaya']
const insS = db.prepare('INSERT INTO students (full_name, group_id, pin_entered, created_at) VALUES (?,?,1,?)')
const ids1 = k1.map((n) => Number(insS.run(n, g1, d(-10)).lastInsertRowid))
const ids2 = k2.map((n) => Number(insS.run(n, g2, d(-9)).lastInsertRowid))
// dua siswa belum punya kelompok (untuk uji /admin/siswa)
db.prepare('INSERT INTO students (full_name, created_at) VALUES (?,?)').run('Intan Permata', d(-1))
db.prepare('INSERT INTO students (full_name, created_at) VALUES (?,?)').run('Bayu Segara', d(0))

// ---- progres (fitur 1, 3, bab-bab materi 21-24 → 2) ----
const insP = db.prepare('INSERT INTO module_progress (student_id, feature_number, completed, updated_at) VALUES (?,1,1,?)')
ids1.forEach((id, i) => {
  insP.run(id, d(-8 + i * 0.1))
  ;[21, 22, 23, 24, 2, 4, 5, 7].forEach((f) =>
    db.prepare('INSERT INTO module_progress (student_id, feature_number, completed, updated_at) VALUES (?,?,1,?)').run(id, f, d(-7)),
  )
})
ids2.forEach((id) => insP.run(id, d(-6)))
db.prepare('INSERT INTO module_progress (student_id, feature_number, completed, updated_at) VALUES (?,?,1,?)').run(ids2[0], 21, d(-5))

// ---- hasil kuis ----
const insQ = db.prepare('INSERT INTO quiz_results (student_id, score, total_questions, passed, attempt_number, created_at) VALUES (?,?,10,?,?,?)')
const q1 = [100, 80, 90, 70]
q1.forEach((s, i) => {
  insQ.run(ids1[i], Math.max(40, s - 30), 0, 1, d(-7))
  insQ.run(ids1[i], s, 1, 2, d(-6))
})
insQ.run(ids2[0], 60, 0, 1, d(-4))
insQ.run(ids2[0], 80, 1, 1, d(-3))
insQ.run(ids2[1], 50, 0, 1, d(-2))

// ---- wawancara Kelompok 1 ----
db.prepare(
  `INSERT INTO interview_data
   (group_id, product_a_name, product_b_name, ingredients, time_per_a, time_per_b, time_total, time_unit, price_a, cost_a, price_b, cost_b, created_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
).run(
  g1,
  'Kue Lapis',
  'Risoles',
  JSON.stringify([
    { name: 'Tepung', unit: 'gram', per_a: 200, per_b: 150, total: 10000 },
    { name: 'Telur', unit: 'butir', per_a: 2, per_b: 1, total: 50 },
    { name: 'Gula', unit: 'gram', per_a: 100, per_b: 50, total: 3000 },
  ]),
  20,
  15,
  600,
  'menit',
  15000,
  9000,
  12000,
  7000,
  d(-5),
)

// ---- percobaan pertidaksamaan Kelompok 1 (masih salah di 2 item) ----
db.prepare(
  `INSERT INTO inequality_submissions (group_id, student_id, attempt_number, inequalities, objective_function, objective_correct, all_correct, created_at)
   VALUES (?,?,?,?,?,?,0,?)`,
).run(
  g1,
  ids1[0],
  1,
  JSON.stringify([
    { label: 'Tepung', input: '200x + 150y <= 10000', correct: true, hint: '' },
    { label: 'Telur', input: '2x + y <= 60', correct: false, hint: 'Ruas kanan harus berisi total Telur yang tersedia per hari. Cek kembali form data wawancaramu.' },
    { label: 'Gula', input: '100x + 500y <= 3000', correct: false, hint: 'Cek data wawancaramu: berapa gram Gula untuk 1 Kue Lapis dan 1 Risoles?' },
    { label: 'Waktu Produksi', input: '20x + 15y <= 600', correct: true, hint: '' },
    { label: 'Syarat x ≥ 0, y ≥ 0', input: 'x >= 0, y >= 0', correct: true, hint: '' },
    { label: 'Fungsi Tujuan', input: 'Z = 6000x + 5000y', correct: true, hint: '' },
  ]),
  'Z = 6000x + 5000y',
  0,
  d(-4),
)

// ---- jurnal ----
const insJ = db.prepare(
  'INSERT INTO journals (student_id, group_id, day_number, activity, obstacle, file_url, file_name, file_type, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
)
ids1.forEach((id, i) => {
  insJ.run(id, g1, 1, 'Menonton video cerita masalah kantin dan mendiskusikan kendala dapur dengan kelompok.', 'Sinyal wifi kelas lambat.', null, null, null, d(-3))
  insJ.run(id, g1, 2, 'Belajar menggambar daerah penyelesaian di Fitur 3 dan mencoba slider koefisien.', 'Bingung menentukan titik uji.', null, null, null, d(-2))
})
// jurnal hari ini untuk Kelompok 1 agar demo tampak aktif
insJ.run(ids1[0], g1, 3, 'Menyusun pertidaksamaan dari data wawancara di Fitur 6 dan memperbaiki koefisien gula.', 'Hampir lupa mengubah jam ke menit.', null, null, null, d(0))
insJ.run(ids1[1], g1, 3, 'Mencari titik pojok di Fitur 3 dengan slider grafik.', 'Sulit membaca skala grafik.', null, null, null, d(0))
insJ.run(ids1[2], g1, 3, 'Membantu menghitung keuntungan per unit kedua produk.', 'Hitung perkalian besar sering salah.', null, null, null, d(0))
insJ.run(ids1[3], g1, 3, 'Merapikan data wawancara dan mengecek ulang satuan bahan.', 'Data total gula sempat terbalik.', null, null, null, d(0))
insJ.run(ids2[0], g2, 1, 'Membaca modul materi bab 1.', 'Sulit memahami istilah variabel.', null, null, null, d(-2))
insJ.run(ids2[1], g2, 1, 'Menonton video.', '-', null, null, null, d(-1))

// ---- portofolio & refleksi: dikosongkan agar bisa dicoba dari aplikasi ----

// ---- notifikasi demo ----
db.prepare('INSERT INTO notifications (student_id, message, is_read, created_at) VALUES (?,?,0,?)').run(
  ids2[1],
  '🔔 Pengingat dari gurumu: ayo lengkapi tugas PjBL hari ini — cek fitur yang belum selesai ya!',
  d(-1),
)

// ---- pengaturan proyek ----
const start = new Date(today.getTime() - 3 * 86400000).toISOString().slice(0, 10)
db.prepare('INSERT INTO settings (key, value) VALUES (?,?)').run('project_start', start)
db.prepare('INSERT INTO settings (key, value) VALUES (?,?)').run('project_days', '10')

console.log('✓ Data demo siap!')
console.log('  Guru    : password "guru123"  → /guru/masuk')
console.log('  Siswa   : "Andi Pratama Wijaya" + PIN 1234 (Kelompok 1, data lengkap)')
console.log('            "Eka Putri Ramadhani" + PIN 5678 (Kelompok 2, belum wawancara)')
console.log('            "Intan Permata" (belum punya kelompok)')
db.close()
