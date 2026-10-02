-- ============================================
-- BAGIAN 2 dari 2 - SEMUA INDEKS (7 indeks)
-- Jalankan SETELAH 1-tabel.sql sukses.
-- ============================================

CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id);

CREATE INDEX IF NOT EXISTS idx_progress_student ON module_progress(student_id);

CREATE INDEX IF NOT EXISTS idx_quiz_student ON quiz_results(student_id);

CREATE INDEX IF NOT EXISTS idx_interview_group ON interview_data(group_id);

CREATE INDEX IF NOT EXISTS idx_ineq_group ON inequality_submissions(group_id);

CREATE INDEX IF NOT EXISTS idx_journals_student ON journals(student_id);

CREATE INDEX IF NOT EXISTS idx_journals_group ON journals(group_id);
