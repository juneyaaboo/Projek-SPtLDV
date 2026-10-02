-- ============================================
-- BAGIAN 1 dari 2 - SEMUA TABEL (13 tabel)
-- Tempel seluruh isi berkas ini ke Console D1, klik Run.
-- Setelah sukses, lanjutkan ke 2-indeks.sql
-- ============================================

-- ============================================================
-- Skema Database D1 - Platform PjBL SPtLDV (SMK Tata Boga)
-- ============================================================
-- CATATAN:
-- 1. Aman dijalankan BERULANG KALI (semua memakai IF NOT EXISTS,
--    data yang sudah ada tidak akan terhapus).
-- 2. Setiap indeks (INDEX) diletakkan tepat di bawah tabelnya,
--    jadi tidak ada pernyataan yang bergantung pada bagian lain.
-- 3. Bila konsol D1 kesulitan menjalankan banyak pernyataan
--    sekaligus, jalankan bertahap lewat berkas kecil di folder
--    deploy/sql/ : 1-tabel.sql lalu 2-indeks.sql
-- ============================================================

-- ===== TABEL: teachers (akun guru) =====
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  class_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===== TABEL: groups (kelompok + PIN) =====
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pin TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===== TABEL: students (siswa, login cukup nama) =====
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT UNIQUE NOT NULL,
  group_id INTEGER REFERENCES groups(id),
  pin_entered BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===== TABEL: module_progress (progres fitur per siswa) =====
CREATE TABLE IF NOT EXISTS module_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER REFERENCES students(id),
  feature_number INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, feature_number)
);

-- ===== TABEL: quiz_results (hasil kuis Fitur 4) =====
CREATE TABLE IF NOT EXISTS quiz_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER REFERENCES students(id),
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===== TABEL: interview_data (hasil wawancara Fitur 5) =====
-- Kolom ingredients berisi teks JSON berisi daftar bahan.
CREATE TABLE IF NOT EXISTS interview_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER REFERENCES groups(id),
  product_a_name TEXT NOT NULL,
  product_b_name TEXT NOT NULL,
  ingredients TEXT NOT NULL,
  time_per_a INTEGER NOT NULL,
  time_per_b INTEGER NOT NULL,
  time_total INTEGER NOT NULL,
  time_unit TEXT DEFAULT 'menit',
  price_a INTEGER NOT NULL,
  cost_a INTEGER NOT NULL,
  price_b INTEGER NOT NULL,
  cost_b INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===== TABEL: inequality_submissions (percobaan Fitur 6) =====
-- Kolom inequalities berisi teks JSON berisi jawaban + status benar/salah.
CREATE TABLE IF NOT EXISTS inequality_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER REFERENCES groups(id),
  student_id INTEGER REFERENCES students(id),
  attempt_number INTEGER DEFAULT 1,
  inequalities TEXT NOT NULL,
  objective_function TEXT,
  objective_correct BOOLEAN,
  all_correct BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===== TABEL: journals (jurnal harian Fitur 7) =====
CREATE TABLE IF NOT EXISTS journals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER REFERENCES students(id),
  group_id INTEGER REFERENCES groups(id),
  day_number INTEGER NOT NULL,
  activity TEXT,
  obstacle TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===== TABEL: portfolios (portofolio kelompok Fitur 9) =====
CREATE TABLE IF NOT EXISTS portfolios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER REFERENCES groups(id),
  format_type TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===== TABEL: reflections (refleksi Fitur 10) =====
CREATE TABLE IF NOT EXISTS reflections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER REFERENCES students(id),
  what_learned TEXT,
  what_was_hard TEXT,
  improvement_rating INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===== TABEL: sessions (sesi login berbasis cookie) =====
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  student_id INTEGER REFERENCES students(id),
  teacher_id INTEGER REFERENCES teachers(id),
  pin_fails INTEGER DEFAULT 0,
  locked_until TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

-- ===== TABEL: notifications (pengingat dari guru) =====
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER REFERENCES students(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===== TABEL: settings (pengaturan proyek: tanggal mulai, lama hari) =====
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
