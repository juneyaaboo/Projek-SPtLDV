import { Hono } from 'hono'
import type { Context } from 'hono'
import type {
  Env,
  Role,
  SessionInfo,
  StudentRow,
  GroupRow,
  InterviewRow,
  Ingredient,
} from './types'
import {
  createSession,
  destroySession,
  getSession,
  hashPassword,
  verifyPassword,
  jakartaDateOf,
  jakartaToday,
  addDays,
  diffDays,
  randomPin,
  fmtNum,
} from './util'
import {
  checkConstraint,
  checkNonNeg,
  checkObjective,
  type ItemFeedback,
  type KeyConstraint,
} from './parse'
import { autoView, solveLP, type LPConstraint } from './lp'
import { QUIZ } from './quiz'

type Ctx = Context<{ Bindings: Env; Variables: { session: SessionInfo | null } }>

const app = new Hono<{ Bindings: Env; Variables: { session: SessionInfo | null } }>()

app.onError((err, c) => {
  console.error('Worker error:', err)
  return c.json({ error: 'Terjadi kesalahan pada server. Coba lagi ya.' }, 500)
})

app.notFound((c) => c.json({ error: 'Rute API tidak ditemukan.' }, 404))

// ================= middleware sesi =================

app.use('/api/*', async (c, next) => {
  c.set('session', await getSession(c))
  await next()
})

function requireRole(roles: Role[]) {
  return async (c: Ctx, next: () => Promise<void>) => {
    const s = c.get('session')
    if (!s) return c.json({ error: 'Kamu belum masuk. Silakan masuk dulu ya.' }, 401)
    if (!roles.includes(s.role)) {
      if (s.role === 'student') {
        return c.json(
          { error: 'Fitur ini butuh akses kelompok. Masukkan PIN kelompokmu dulu ya.', needPin: true },
          403,
        )
      }
      return c.json({ error: 'Kamu tidak punya akses ke fitur ini.' }, 403)
    }
    await next()
  }
}

const needStudent = requireRole(['student', 'student_l2'])
const needL2 = requireRole(['student_l2'])
const needTeacher = requireRole(['teacher'])

// ================= helper data =================

function parseIngredients(json: string): Ingredient[] {
  try {
    const arr = JSON.parse(json)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function getStudent(c: Ctx, id: number): Promise<StudentRow | null> {
  return (await c.env.DB.prepare('SELECT * FROM students WHERE id = ?').bind(id).first()) as StudentRow | null
}

async function getGroup(c: Ctx, id: number | null): Promise<GroupRow | null> {
  if (!id) return null
  return (await c.env.DB.prepare('SELECT * FROM groups WHERE id = ?').bind(id).first()) as GroupRow | null
}

async function markProgress(c: Ctx, studentId: number, feature: number): Promise<void> {
  const existing = await c.env.DB.prepare(
    'SELECT id FROM module_progress WHERE student_id = ? AND feature_number = ?',
  )
    .bind(studentId, feature)
    .first()
  if (existing) {
    await c.env.DB.prepare(
      "UPDATE module_progress SET completed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
      .bind(existing.id)
      .run()
  } else {
    await c.env.DB.prepare(
      'INSERT INTO module_progress (student_id, feature_number, completed) VALUES (?,?,1)',
    )
      .bind(studentId, feature)
      .run()
  }
  // Fitur 2 selesai otomatis bila keempat bab ditandai selesai (21–24)
  if (feature >= 21 && feature <= 24) {
    const rows = await c.env.DB.prepare(
      'SELECT feature_number FROM module_progress WHERE student_id = ? AND feature_number IN (21,22,23,24) AND completed = 1',
    )
      .bind(studentId)
      .all()
    const set = new Set((rows.results ?? []).map((r) => Number(r.feature_number)))
    if (set.size === 4) await markProgress(c, studentId, 2)
  }
}

async function quizStat(c: Ctx, studentId: number) {
  const rows = await c.env.DB.prepare(
    'SELECT score, passed, attempt_number FROM quiz_results WHERE student_id = ? ORDER BY score DESC LIMIT 1',
  )
    .bind(studentId)
    .first()
  const cnt = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM quiz_results WHERE student_id = ?')
    .bind(studentId)
    .first()
  if (!rows) return { best: null as number | null, passed: false, attempts: Number(cnt?.n ?? 0) }
  return { best: Number(rows.score), passed: !!Number(rows.passed), attempts: Number(cnt?.n ?? 0) }
}

async function journalDates(c: Ctx, studentId: number): Promise<string[]> {
  const rows = await c.env.DB.prepare(
    "SELECT date(created_at, '+7 hours') AS d FROM journals WHERE student_id = ?",
  )
    .bind(studentId)
    .all()
  return (rows.results ?? []).map((r) => String(r.d))
}

async function interviewLatest(c: Ctx, groupId: number): Promise<InterviewRow | null> {
  return (await c.env.DB.prepare(
    'SELECT * FROM interview_data WHERE group_id = ? ORDER BY id DESC LIMIT 1',
  )
    .bind(groupId)
    .first()) as InterviewRow | null
}

async function ineqLatestRaw(c: Ctx, groupId: number) {
  return await c.env.DB.prepare(
    'SELECT * FROM inequality_submissions WHERE group_id = ? ORDER BY id DESC LIMIT 1',
  )
    .bind(groupId)
    .first()
}

async function ineqAttemptCount(c: Ctx, groupId: number): Promise<number> {
  const r = await c.env.DB.prepare(
    'SELECT COUNT(*) AS n FROM inequality_submissions WHERE group_id = ?',
  )
    .bind(groupId)
    .first()
  return Number(r?.n ?? 0)
}

// ---------- kunci jawaban dari data wawancara ----------

export interface AnswerKey {
  constraints: KeyConstraint[]
  timeKey: KeyConstraint
  objective: { p: number; q: number }
  timeTotalMin: number
  products: { a: string; b: string }
}

function buildKey(row: InterviewRow): AnswerKey {
  const ingredients = parseIngredients(row.ingredients)
  const mul = row.time_unit === 'jam' ? 60 : 1
  const constraints: KeyConstraint[] = ingredients.map((ing) => ({
    label: ing.name,
    a: Number(ing.per_a) || 0,
    b: Number(ing.per_b) || 0,
    op: '<=',
    rhs: Number(ing.total) || 0,
    unit: ing.unit,
    productA: row.product_a_name,
    productB: row.product_b_name,
  }))
  const timeKey: KeyConstraint = {
    label: 'Waktu Produksi',
    a: (Number(row.time_per_a) || 0) * mul,
    b: (Number(row.time_per_b) || 0) * mul,
    op: '<=',
    rhs: (Number(row.time_total) || 0) * mul,
    unit: 'menit',
    productA: row.product_a_name,
    productB: row.product_b_name,
    isTime: true,
  }
  return {
    constraints,
    timeKey,
    objective: {
      p: (Number(row.price_a) || 0) - (Number(row.cost_a) || 0),
      q: (Number(row.price_b) || 0) - (Number(row.cost_b) || 0),
    },
    timeTotalMin: timeKey.rhs,
    products: { a: row.product_a_name, b: row.product_b_name },
  }
}

export interface IneqItem {
  label: string
  input: string
  correct: boolean
  hint: string
}

/** Evaluasi ulang percobaan terakhir terhadap kunci SAAT INI. */
async function evaluateLatest(c: Ctx, groupId: number) {
  const attempts = await ineqAttemptCount(c, groupId)
  const latest = await ineqLatestRaw(c, groupId)
  const interview = await interviewLatest(c, groupId)
  if (!latest || !interview) return { attempts, solved: false, items: [] as StoredItem[], objectiveInput: '' }
  const key = buildKey(interview)
  let items: IneqItem[] = []
  try {
    items = JSON.parse(String(latest.inequalities))
  } catch {
    items = []
  }
  const reItems: StoredItem[] = items.map((it) => {
    const input = String(it.input ?? '')
    const base: StoredItem = { label: it.label, input, correct: false, hint: '' }
    if (it.label === key.timeKey.label) return { ...base, ...only(checkConstraint(input, key.timeKey)) }
    if (it.label.startsWith('Syarat')) return { ...base, ...only(checkNonNeg(input)) }
    if (it.label.startsWith('Fungsi')) return { ...base, ...only(checkObjective(input, key.objective.p, key.objective.q)) }
    const ing = key.constraints.find((k) => k.label === it.label)
    if (ing) return { ...base, ...only(checkConstraint(input, ing)) }
    return { ...base, hint: 'Data wawancara berubah — cek ulang jawabanmu.' }
  })
  return {
    attempts,
    solved: reItems.length > 0 && reItems.every((i) => i.correct),
    items: reItems,
    objectiveInput: String(latest.objective_function ?? ''),
  }
}

type StoredItem = ItemFeedback & { input: string }

/** ambil hanya label/correct/hint dari hasil pemeriksaan (input tetap milik siswa) */
function only(f: ItemFeedback): ItemFeedback {
  return { label: f.label, correct: f.correct, hint: f.hint }
}

/** Data "hadiah" grafik — hanya untuk kelompok yang semua jawabannya benar. */
function buildReward(key: AnswerKey) {
  const cons: LPConstraint[] = [
    ...key.constraints.map((k) => ({ a: k.a, b: k.b, op: k.op as '<=' | '>=', rhs: k.rhs })),
    { a: key.timeKey.a, b: key.timeKey.b, op: '<=', rhs: key.timeKey.rhs },
    { a: 1, b: 0, op: '>=', rhs: 0 },
    { a: 0, b: 1, op: '>=', rhs: 0 },
  ]
  const view = autoView(cons)
  const sol = solveLP(cons, key.objective, view)
  const lines = [
    ...key.constraints.map((k) => ({
      label: k.label,
      eq: `${fmtNum(k.a)}x + ${fmtNum(k.b)}y ≤ ${fmtNum(k.rhs)}`,
      a: k.a,
      b: k.b,
      rhs: k.rhs,
    })),
    {
      label: 'Waktu Produksi',
      eq: `${fmtNum(key.timeKey.a)}x + ${fmtNum(key.timeKey.b)}y ≤ ${fmtNum(key.timeKey.rhs)}`,
      a: key.timeKey.a,
      b: key.timeKey.b,
      rhs: key.timeKey.rhs,
    },
  ]
  return {
    lines,
    objective: {
      eq: `Z = ${fmtNum(key.objective.p)}x + ${fmtNum(key.objective.q)}y`,
      p: key.objective.p,
      q: key.objective.q,
    },
    products: key.products,
    vertices: sol.vertices,
    optimal: sol.optimal,
    view,
  }
}

// ---------- pengaturan proyek ----------

async function getSetting(c: Ctx, key: string): Promise<string | null> {
  const r = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first()
  return r ? String(r.value) : null
}

async function setSetting(c: Ctx, key: string, value: string): Promise<void> {
  await c.env.DB.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  )
    .bind(key, value)
    .run()
}

async function projectPeriod(c: Ctx): Promise<{ start: string; days: number }> {
  let start = await getSetting(c, 'project_start')
  if (!start) {
    const r = await c.env.DB.prepare('SELECT MIN(created_at) AS t FROM students').first()
    start = r?.t ? jakartaDateOf(String(r.t)) : jakartaToday()
  }
  const days = parseInt((await getSetting(c, 'project_days')) ?? '10', 10) || 10
  return { start, days }
}

// ================= SETUP & AUTENTIKASI =================

app.get('/api/health', (c) => c.json({ ok: true }))

app.get('/api/setup/status', async (c) => {
  const r = await c.env.DB.prepare('SELECT id, class_name FROM teachers LIMIT 1').first()
  return c.json({ teacherExists: !!r, className: r ? String(r.class_name ?? '') : '' })
})

app.post('/api/setup', async (c) => {
  const exists = await c.env.DB.prepare('SELECT id FROM teachers LIMIT 1').first()
  if (exists) return c.json({ error: 'Guru sudah terdaftar. Silakan masuk lewat halaman login guru.' }, 409)
  const body = await c.req.json().catch(() => ({}))
  const name = String(body.name ?? '').trim()
  const password = String(body.password ?? '')
  const className = String(body.className ?? '').trim()
  if (name.length < 3) return c.json({ error: 'Nama guru minimal 3 karakter.' }, 400)
  if (password.length < 6) return c.json({ error: 'Password minimal 6 karakter.' }, 400)
  const hash = await hashPassword(password)
  const r = await c.env.DB.prepare('INSERT INTO teachers (name, password_hash, class_name) VALUES (?,?,?)')
    .bind(name, hash, className || null)
    .run()
  const teacherId = Number(r.meta?.last_row_id ?? 0)
  await createSession(c, 'teacher', { teacherId })
  return c.json({ ok: true, role: 'teacher' })
})

app.post('/api/auth/guru', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const password = String(body.password ?? '')
  const rows = await c.env.DB.prepare('SELECT id, password_hash FROM teachers').all()
  for (const t of rows.results ?? []) {
    if (await verifyPassword(password, String(t.password_hash))) {
      await createSession(c, 'teacher', { teacherId: Number(t.id) })
      return c.json({ ok: true, role: 'teacher' })
    }
  }
  return c.json({ error: 'Password salah. Coba lagi ya.' }, 401)
})

app.post('/api/auth/siswa', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const fullName = String(body.fullName ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (fullName.length < 3) return c.json({ error: 'Tulis nama lengkapmu ya (minimal 3 huruf).' }, 400)
  let student = (await c.env.DB.prepare('SELECT * FROM students WHERE full_name = ?')
    .bind(fullName)
    .first()) as StudentRow | null
  if (!student) {
    const r = await c.env.DB.prepare('INSERT INTO students (full_name) VALUES (?)').bind(fullName).run()
    const id = Number(r.meta?.last_row_id ?? 0)
    student = {
      id,
      full_name: fullName,
      group_id: null,
      pin_entered: 0,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    }
  }
  const role: Role = Number(student.pin_entered) ? 'student_l2' : 'student'
  await createSession(c, role, { studentId: student.id })
  return c.json({ ok: true, role })
})

app.post('/api/auth/pin', async (c) => {
  const s = c.get('session')!
  if (s.role === 'student_l2') return c.json({ ok: true, already: true })
  const student = await getStudent(c, s.studentId!)
  if (!student) return c.json({ error: 'Sesi tidak valid. Masuk ulang ya.' }, 401)

  const now = Date.now()
  if (s.lockedUntil && new Date(s.lockedUntil).getTime() > now) {
    const mins = Math.ceil((new Date(s.lockedUntil).getTime() - now) / 60000)
    return c.json(
      { error: `Terlalu banyak percobaan. Akunmu dikunci ${mins} menit lagi.`, lockedUntil: s.lockedUntil },
      429,
    )
  }

  const body = await c.req.json().catch(() => ({}))
  const pin = String(body.pin ?? '').trim()
  if (!/^\d{4}$/.test(pin)) return c.json({ error: 'PIN harus 4 angka.' }, 400)

  if (!student.group_id) {
    return c.json({ error: 'Kamu belum memiliki kelompok. Minta PIN ke gurumu.' }, 400)
  }
  const group = await c.env.DB.prepare('SELECT * FROM groups WHERE pin = ?').bind(pin).first()
  if (!group || Number(group.id) !== Number(student.group_id)) {
    const fails = (s.pinFails ?? 0) + 1
    if (fails >= 3) {
      const lockedUntil = new Date(now + 5 * 60000).toISOString()
      await c.env.DB.prepare('UPDATE sessions SET pin_fails = 0, locked_until = ? WHERE token = ?')
        .bind(lockedUntil, s.token)
        .run()
      return c.json(
        { error: 'PIN salah 3 kali. Kamu dikunci selama 5 menit. Coba lagi nanti ya.', lockedUntil, attemptsLeft: 0 },
        429,
      )
    }
    await c.env.DB.prepare('UPDATE sessions SET pin_fails = ? WHERE token = ?').bind(fails, s.token).run()
    return c.json({ error: 'PIN salah atau kamu bukan anggota kelompok itu.', attemptsLeft: 3 - fails }, 400)
  }

  await c.env.DB.prepare('UPDATE students SET pin_entered = 1 WHERE id = ?').bind(student.id).run()
  await c.env.DB.prepare("UPDATE sessions SET role = 'student_l2', pin_fails = 0, locked_until = NULL WHERE token = ?")
    .bind(s.token)
    .run()
  const g = await getGroup(c, student.group_id)
  return c.json({ ok: true, role: 'student_l2', groupName: g?.name ?? '' })
})

app.post('/api/auth/keluar', async (c) => {
  await destroySession(c)
  return c.json({ ok: true })
})

// ================= /api/me & ringkasan =================

app.get('/api/me', needStudent, async (c) => {
  const s = c.get('session')!
  const student = await getStudent(c, s.studentId!)
  if (!student) return c.json({ error: 'Sesi tidak valid. Masuk ulang ya.' }, 401)
  const group = await getGroup(c, student.group_id)
  const progRows = await c.env.DB.prepare(
    'SELECT feature_number FROM module_progress WHERE student_id = ? AND completed = 1',
  )
    .bind(student.id)
    .all()
  const progress = (progRows.results ?? []).map((r) => Number(r.feature_number))
  const today = jakartaToday()
  const jr = await c.env.DB.prepare(
    "SELECT id FROM journals WHERE student_id = ? AND date(created_at, '+7 hours') = ?",
  )
    .bind(student.id, today)
    .first()
  const unread = await c.env.DB.prepare(
    'SELECT COUNT(*) AS n FROM notifications WHERE student_id = ? AND is_read = 0',
  )
    .bind(student.id)
    .first()
  const quiz = await quizStat(c, student.id)
  return c.json({
    role: s.role,
    student: {
      id: student.id,
      fullName: student.full_name,
      groupId: student.group_id,
      groupName: group?.name ?? null,
      pinEntered: !!Number(student.pin_entered),
    },
    progress,
    journalToday: !!jr,
    unreadNotifications: Number(unread?.n ?? 0),
    quiz: quiz,
    today: today,
  })
})

app.get('/api/siswa/ringkasan', needStudent, async (c) => {
  const s = c.get('session')!
  const student = await getStudent(c, s.studentId!)
  if (!student) return c.json({ error: 'Sesi tidak valid.' }, 401)
  const interview = student.group_id ? await interviewLatest(c, student.group_id) : null
  const ineq = student.group_id ? await evaluateLatest(c, student.group_id) : null
  const portfolio = student.group_id
    ? await c.env.DB.prepare('SELECT id FROM portfolios WHERE group_id = ?').bind(student.group_id).first()
    : null
  const refl = await c.env.DB.prepare('SELECT * FROM reflections WHERE student_id = ? ORDER BY id DESC LIMIT 1')
    .bind(student.id)
    .first()
  const jCount = await c.env.DB.prepare('SELECT COUNT(*) AS n, MAX(day_number) AS maxday FROM journals WHERE student_id = ?')
    .bind(student.id)
    .first()
  const period = await projectPeriod(c)
  const quiz = await quizStat(c, student.id)
  return c.json({
    interviewDone: !!interview,
    ineqSolved: !!ineq?.solved,
    ineqAttempts: ineq?.attempts ?? 0,
    portfolioDone: !!portfolio,
    reflectionDone: !!refl,
    journalCount: Number(jCount?.n ?? 0),
    journalNextDay: Number(jCount?.maxday ?? 0) + 1,
    project: period,
    quiz,
  })
})

// ================= PROGRES =================

app.post('/api/siswa/progres', needStudent, async (c) => {
  const s = c.get('session')!
  const body = await c.req.json().catch(() => ({}))
  const feature = Number(body.feature)
  if (![1, 3, 21, 22, 23, 24].includes(feature)) {
    return c.json({ error: 'Nomor fitur tidak valid.' }, 400)
  }
  await markProgress(c, s.studentId!, feature)
  return c.json({ ok: true })
})

// ================= KUIS (FITUR 4) =================

app.get('/api/kuis', needStudent, async (c) => {
  const s = c.get('session')!
  const stat = await quizStat(c, s.studentId!)
  return c.json({
    questions: QUIZ.map((q) => ({ id: q.id, q: q.q, options: q.options })),
    durationMinutes: 15,
    passScore: 70,
    ...stat,
  })
})

app.post('/api/kuis/jawab', needStudent, async (c) => {
  const s = c.get('session')!
  const body = await c.req.json().catch(() => ({}))
  const answers = (body.answers ?? {}) as Record<string, number>
  let correct = 0
  const detail = QUIZ.map((q) => {
    const your = Number(answers[String(q.id)])
    const isCorrect = your === q.answer
    if (isCorrect) correct++
    return { id: q.id, q: q.q, options: q.options, answer: q.answer, your: isNaN(your) ? -1 : your, correct: isCorrect, explanation: q.explanation }
  })
  const score = correct * 10
  const passed = score >= 70
  const cnt = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM quiz_results WHERE student_id = ?')
    .bind(s.studentId!)
    .first()
  const attempt = Number(cnt?.n ?? 0) + 1
  await c.env.DB.prepare(
    'INSERT INTO quiz_results (student_id, score, total_questions, passed, attempt_number) VALUES (?,?,?,?,?)',
  )
    .bind(s.studentId!, score, QUIZ.length, passed ? 1 : 0, attempt)
    .run()
  if (passed) await markProgress(c, s.studentId!, 4)
  const stat = await quizStat(c, s.studentId!)
  return c.json({
    score,
    total: QUIZ.length,
    passed,
    attempt,
    bestScore: stat.best,
    message: passed
      ? 'Selamat! Kamu lulus kuis. Silakan lanjut ke proyek.'
      : 'Nilai kamu belum mencapai 70. Silakan pelajari kembali modul materi dan coba lagi.',
    review: passed ? detail : undefined,
  })
})

// ================= WAWANCARA (FITUR 5) =================

app.get('/api/wawancara', needL2, async (c) => {
  const s = c.get('session')!
  const student = await getStudent(c, s.studentId!)
  const row = student?.group_id ? await interviewLatest(c, student.group_id) : null
  if (!row) return c.json({ data: null })
  return c.json({
    data: {
      productA: row.product_a_name,
      productB: row.product_b_name,
      ingredients: parseIngredients(row.ingredients),
      timePerA: row.time_per_a,
      timePerB: row.time_per_b,
      timeTotal: row.time_total,
      timeUnit: row.time_unit,
      priceA: row.price_a,
      costA: row.cost_a,
      priceB: row.price_b,
      costB: row.cost_b,
    },
  })
})

app.post('/api/wawancara', needL2, async (c) => {
  const s = c.get('session')!
  const student = await getStudent(c, s.studentId!)
  if (!student?.group_id) return c.json({ error: 'Kamu belum memiliki kelompok.' }, 400)
  const body = await c.req.json().catch(() => ({}))
  const productA = String(body.productA ?? '').trim()
  const productB = String(body.productB ?? '').trim()
  const ingredients = Array.isArray(body.ingredients) ? body.ingredients : []
  if (!productA || !productB) return c.json({ error: 'Nama Produk A dan Produk B wajib diisi.' }, 400)
  if (productA.length > 40 || productB.length > 40) return c.json({ error: 'Nama produk terlalu panjang (maks 40 huruf).' }, 400)
  if (ingredients.length < 2) return c.json({ error: 'Minimal ada 2 bahan.' }, 400)
  if (ingredients.length > 12) return c.json({ error: 'Maksimal 12 bahan.' }, 400)
  const num = (v: unknown) => {
    const n = Number(v)
    return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN
  }
  const cleanIngredients = []
  for (const ing of ingredients) {
    const name = String(ing.name ?? '').trim()
    const unit = String(ing.unit ?? '').trim() || 'satuan'
    const perA = num(ing.perA)
    const perB = num(ing.perB)
    const total = num(ing.total)
    if (!name) return c.json({ error: 'Ada bahan yang belum diberi nama.' }, 400)
    if (isNaN(perA) || isNaN(perB) || isNaN(total)) return c.json({ error: `Angka pada bahan "${name}" tidak valid.` }, 400)
    if (perA <= 0 || perB <= 0) return c.json({ error: `Kebutuhan ${name} per produk harus lebih dari 0.` }, 400)
    if (total <= 0) return c.json({ error: `Total ${name} per hari harus lebih dari 0.` }, 400)
    cleanIngredients.push({ name: name.slice(0, 30), unit: unit.slice(0, 12), per_a: perA, per_b: perB, total })
  }
  const timePerA = num(body.timePerA)
  const timePerB = num(body.timePerB)
  const timeTotal = num(body.timeTotal)
  const timeUnit = ['menit', 'jam'].includes(String(body.timeUnit)) ? String(body.timeUnit) : 'menit'
  const priceA = num(body.priceA)
  const costA = num(body.costA)
  const priceB = num(body.priceB)
  const costB = num(body.costB)
  if ([timePerA, timePerB, timeTotal].some(isNaN) || timePerA <= 0 || timePerB <= 0 || timeTotal <= 0) {
    return c.json({ error: 'Data waktu produksi tidak valid (harus angka lebih dari 0).' }, 400)
  }
  if ([priceA, costA, priceB, costB].some(isNaN)) {
    return c.json({ error: 'Data harga/modal tidak valid.' }, 400)
  }
  if (costA >= priceA || costB >= priceB) {
    return c.json({ error: 'Modal harus lebih kecil dari harga jual agar ada keuntungan.' }, 400)
  }
  await c.env.DB.prepare(
    `INSERT INTO interview_data
      (group_id, product_a_name, product_b_name, ingredients, time_per_a, time_per_b, time_total, time_unit, price_a, cost_a, price_b, cost_b)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      student.group_id,
      productA,
      productB,
      JSON.stringify(cleanIngredients),
      timePerA,
      timePerB,
      timeTotal,
      timeUnit,
      priceA,
      costA,
      priceB,
      costB,
    )
    .run()
  await markProgress(c, s.studentId!, 5)
  return c.json({
    ok: true,
    profitA: priceA - costA,
    profitB: priceB - costB,
  })
})

// ================= PERTIDAKSAMAAN (FITUR 6) =================

app.get('/api/pertidaksamaan/status', needL2, async (c) => {
  const s = c.get('session')!
  const student = await getStudent(c, s.studentId!)
  if (!student?.group_id) return c.json({ error: 'Kamu belum memiliki kelompok.' }, 400)
  const ev = await evaluateLatest(c, student.group_id)
  return c.json({
    attempts: ev.attempts,
    solved: ev.solved,
    items: ev.items.map((i) => ({ label: i.label, input: i.input ?? undefined, correct: i.correct, hint: i.hint })),
  })
})

app.post('/api/pertidaksamaan/cek', needL2, async (c) => {
  const s = c.get('session')!
  const student = await getStudent(c, s.studentId!)
  if (!student?.group_id) return c.json({ error: 'Kamu belum memiliki kelompok.' }, 400)
  const groupId = student.group_id
  const interview = await interviewLatest(c, groupId)
  if (!interview) {
    return c.json({ error: 'Isi dulu data wawancara di Fitur 5, baru cek pertidaksamaan.' }, 400)
  }
  const key = buildKey(interview)
  const body = await c.req.json().catch(() => ({}))
  const inputs: { label: string; input: string }[] = []
  const ingInputs: { name: string; input: string }[] = Array.isArray(body.ingredients) ? body.ingredients : []
  if (!ingInputs.length) return c.json({ error: 'Jawaban pertidaksamaan bahan masih kosong.' }, 400)

  const items: IneqItem[] = []
  for (const ing of key.constraints) {
    const given = ingInputs.find((i) => String(i.name) === ing.label)
    const input = String(given?.input ?? '')
    items.push({ label: ing.label, input, ...only(checkConstraint(input, ing)) })
    inputs.push({ label: ing.label, input })
  }
  const timeInput = String(body.time ?? '')
  items.push({ label: key.timeKey.label, input: timeInput, ...only(checkConstraint(timeInput, key.timeKey)) })
  inputs.push({ label: key.timeKey.label, input: timeInput })
  const nonnegInput = String(body.nonneg ?? '')
  items.push({ label: 'Syarat x ≥ 0, y ≥ 0', input: nonnegInput, ...only(checkNonNeg(nonnegInput)) })
  inputs.push({ label: 'Syarat x ≥ 0, y ≥ 0', input: nonnegInput })
  const objInput = String(body.objective ?? '')
  items.push({ label: 'Fungsi Tujuan', input: objInput, ...only(checkObjective(objInput, key.objective.p, key.objective.q)) })
  inputs.push({ label: 'Fungsi Tujuan', input: objInput })

  const allCorrect = items.every((i) => i.correct)
  const attempt = (await ineqAttemptCount(c, groupId)) + 1
  await c.env.DB.prepare(
    `INSERT INTO inequality_submissions
      (group_id, student_id, attempt_number, inequalities, objective_function, objective_correct, all_correct)
     VALUES (?,?,?,?,?,?,?)`,
  )
    .bind(
      groupId,
      s.studentId!,
      attempt,
      JSON.stringify(items),
      objInput,
      items[items.length - 1].correct ? 1 : 0,
      allCorrect ? 1 : 0,
    )
    .run()

  let reward = null
  if (allCorrect) {
    await markProgress(c, s.studentId!, 6)
    reward = buildReward(key)
  }
  return c.json({
    attempt,
    allCorrect,
    results: items.map((i) => ({ label: i.label, correct: i.correct, hint: i.hint })),
    reward,
  })
})

app.get('/api/pertidaksamaan/hadiah', needL2, async (c) => {
  const s = c.get('session')!
  const student = await getStudent(c, s.studentId!)
  if (!student?.group_id) return c.json({ error: 'Kamu belum memiliki kelompok.' }, 400)
  const ev = await evaluateLatest(c, student.group_id)
  if (!ev.solved) return c.json({ solved: false })
  const interview = await interviewLatest(c, student.group_id)
  if (!interview) return c.json({ solved: false })
  return c.json({ solved: true, reward: buildReward(buildKey(interview)) })
})

// ================= JURNAL (FITUR 7) =================

const JOURNAL_EXT = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'mp4']

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i === -1 ? '' : name.slice(i + 1).toLowerCase()
}

function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').slice(-80)
}

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  mp4: 'video/mp4',
}

app.get('/api/jurnal', needL2, async (c) => {
  const s = c.get('session')!
  const rows = await c.env.DB.prepare(
    'SELECT id, day_number, activity, obstacle, file_url, file_name, file_type, created_at FROM journals WHERE student_id = ? ORDER BY day_number DESC, id DESC',
  )
    .bind(s.studentId!)
    .all()
  const maxDay = await c.env.DB.prepare('SELECT MAX(day_number) AS m FROM journals WHERE student_id = ?')
    .bind(s.studentId!)
    .first()
  const period = await projectPeriod(c)
  return c.json({
    entries: (rows.results ?? []).map((r) => ({
      id: Number(r.id),
      dayNumber: Number(r.day_number),
      activity: String(r.activity ?? ''),
      obstacle: String(r.obstacle ?? ''),
      fileUrl: r.file_url ? String(r.file_url) : null,
      fileName: r.file_name ? String(r.file_name) : null,
      fileType: r.file_type ? String(r.file_type) : null,
      date: jakartaDateOf(String(r.created_at)),
    })),
    nextDay: Number(maxDay?.m ?? 0) + 1,
    project: period,
  })
})

app.post('/api/jurnal', needL2, async (c) => {
  const s = c.get('session')!
  const student = await getStudent(c, s.studentId!)
  if (!student?.group_id) return c.json({ error: 'Kamu belum memiliki kelompok.' }, 400)
  const body = await c.req.parseBody()
  const activity = String(body.activity ?? '').trim()
  const obstacle = String(body.obstacle ?? '').trim()
  if (!activity) return c.json({ error: 'Ceritakan dulu apa yang kamu kerjakan hari ini.' }, 400)
  if (activity.length > 2000) return c.json({ error: 'Ceritan terlalu panjang (maks 2000 huruf).' }, 400)

  const maxDay = await c.env.DB.prepare('SELECT MAX(day_number) AS m FROM journals WHERE student_id = ?')
    .bind(student.id)
    .first()
  const day = Number(maxDay?.m ?? 0) + 1

  let fileUrl: string | null = null
  let fileName: string | null = null
  let fileType: string | null = null
  const f = body['file']
  if (f && typeof f === 'object' && 'arrayBuffer' in f) {
    const file = f as File
    const ext = extOf(file.name)
    if (!JOURNAL_EXT.includes(ext)) {
      return c.json({ error: `Format berkas .${ext} tidak didukung. Gunakan: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, atau MP4.` }, 400)
    }
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: 'Ukuran berkas maksimal 10 MB.' }, 400)
    }
    const key = `jurnal/${student.id}/${Date.now()}-${safeName(file.name)}`
    const buf = await file.arrayBuffer()
    await c.env.R2.put(key, buf, { httpMetadata: { contentType: file.type || CONTENT_TYPES[ext] || 'application/octet-stream' } })
    fileUrl = `/api/berkas/${key}`
    fileName = file.name
    fileType = ext
  }

  await c.env.DB.prepare(
    'INSERT INTO journals (student_id, group_id, day_number, activity, obstacle, file_url, file_name, file_type) VALUES (?,?,?,?,?,?,?,?)',
  )
    .bind(student.id, student.group_id, day, activity, obstacle || null, fileUrl, fileName, fileType)
    .run()
  await markProgress(c, student.id, 7)
  return c.json({ ok: true, day })
})

app.get('/api/jurnal/kalender', needL2, async (c) => {
  const s = c.get('session')!
  const dates = await journalDates(c, s.studentId!)
  const period = await projectPeriod(c)
  return c.json({ submittedDates: dates, project: period, today: jakartaToday() })
})

// ================= PORTOFOLIO (FITUR 9) =================

const PORTO_TYPES: Record<string, string[]> = {
  'Laporan Tertulis': ['pdf', 'doc', 'docx'],
  Infografis: ['png', 'pdf'],
  Presentasi: ['ppt', 'pptx', 'pdf'],
  Video: ['mp4'],
  Booklet: ['pdf'],
  Lainnya: JOURNAL_EXT,
}

app.get('/api/portofolio', needL2, async (c) => {
  const s = c.get('session')!
  const student = await getStudent(c, s.studentId!)
  const row = student?.group_id
    ? await c.env.DB.prepare('SELECT * FROM portfolios WHERE group_id = ? ORDER BY id DESC LIMIT 1')
        .bind(student.group_id)
        .first()
    : null
  if (!row) return c.json({ data: null })
  return c.json({
    data: {
      formatType: String(row.format_type),
      fileUrl: row.file_url ? String(row.file_url) : null,
      fileName: row.file_name ? String(row.file_name) : null,
      notes: row.notes ? String(row.notes) : '',
      createdAt: String(row.created_at),
    },
  })
})

app.post('/api/portofolio', needL2, async (c) => {
  const s = c.get('session')!
  const student = await getStudent(c, s.studentId!)
  if (!student?.group_id) return c.json({ error: 'Kamu belum memiliki kelompok.' }, 400)
  const groupId = student.group_id
  const body = await c.req.parseBody()
  let formatType = String(body.formatType ?? '').trim()
  const customFormat = String(body.customFormat ?? '').trim()
  if (formatType === 'Lainnya') {
    if (!customFormat) return c.json({ error: 'Tulis dulu format lain yang kamu pilih.' }, 400)
    formatType = `Lainnya: ${customFormat.slice(0, 40)}`
  }
  if (!formatType) return c.json({ error: 'Pilih format portofolio dulu ya.' }, 400)
  const notes = String(body.notes ?? '').trim()

  const f = body['file']
  if (!(f && typeof f === 'object' && 'arrayBuffer' in f)) {
    return c.json({ error: 'Pilih berkas portofolio dulu ya.' }, 400)
  }
  const file = f as File
  const ext = extOf(file.name)
  const baseType = formatType.startsWith('Lainnya') ? 'Lainnya' : formatType
  const allowed = PORTO_TYPES[baseType] ?? JOURNAL_EXT
  if (!allowed.includes(ext)) {
    return c.json({ error: `Format "${formatType}" menerima berkas: ${allowed.map((e) => e.toUpperCase()).join(', ')}. Berkasmu .${ext}` }, 400)
  }
  if (file.size > 50 * 1024 * 1024) {
    return c.json({ error: 'Ukuran berkas maksimal 50 MB.' }, 400)
  }

  const key = `portofolio/${groupId}/${Date.now()}-${safeName(file.name)}`
  const buf = await file.arrayBuffer()
  await c.env.R2.put(key, buf, { httpMetadata: { contentType: file.type || CONTENT_TYPES[ext] || 'application/octet-stream' } })

  const existing = await c.env.DB.prepare('SELECT id, file_url FROM portfolios WHERE group_id = ? ORDER BY id DESC LIMIT 1')
    .bind(groupId)
    .first()
  if (existing) {
    await c.env.DB.prepare(
      'UPDATE portfolios SET format_type = ?, file_url = ?, file_name = ?, notes = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
    )
      .bind(formatType, `/api/berkas/${key}`, file.name, notes || null, Number(existing.id))
      .run()
    // hapus berkas lama di R2
    if (existing.file_url) {
      const oldKey = String(existing.file_url).replace('/api/berkas/', '')
      await c.env.R2.delete(oldKey).catch(() => {})
    }
  } else {
    await c.env.DB.prepare(
      'INSERT INTO portfolios (group_id, format_type, file_url, file_name, notes) VALUES (?,?,?,?,?)',
    )
      .bind(groupId, formatType, `/api/berkas/${key}`, file.name, notes || null)
      .run()
  }
  await markProgress(c, student.id, 9)
  return c.json({ ok: true })
})

// ================= REFLEKSI (FITUR 10) =================

app.get('/api/refleksi', needL2, async (c) => {
  const s = c.get('session')!
  const row = await c.env.DB.prepare('SELECT * FROM reflections WHERE student_id = ? ORDER BY id DESC LIMIT 1')
    .bind(s.studentId!)
    .first()
  const quiz = await quizStat(c, s.studentId!)
  if (!row) return c.json({ data: null, quiz })
  return c.json({
    data: {
      whatLearned: String(row.what_learned ?? ''),
      whatWasHard: String(row.what_was_hard ?? ''),
      rating: Number(row.improvement_rating ?? 0),
      createdAt: String(row.created_at),
    },
    quiz,
  })
})

app.post('/api/refleksi', needL2, async (c) => {
  const s = c.get('session')!
  const body = await c.req.json().catch(() => ({}))
  const whatLearned = String(body.whatLearned ?? '').trim()
  const whatWasHard = String(body.whatWasHard ?? '').trim()
  const rating = Number(body.rating)
  if (!whatLearned) return c.json({ error: 'Ceritakan dulu hal baru yang kamu pelajari ya.' }, 400)
  if (!whatWasHard) return c.json({ error: 'Ceritakan dulu bagian yang paling sulit ya.' }, 400)
  if (!(rating >= 1 && rating <= 5)) return c.json({ error: 'Beri rating pemahamanmu dari 1 sampai 5 bintang.' }, 400)
  await c.env.DB.prepare(
    'INSERT INTO reflections (student_id, what_learned, what_was_hard, improvement_rating) VALUES (?,?,?,?)',
  )
    .bind(s.studentId!, whatLearned, whatWasHard, Math.round(rating))
    .run()
  await markProgress(c, s.studentId!, 10)
  const quiz = await quizStat(c, s.studentId!)
  return c.json({ ok: true, quiz, rating })
})

// ================= NOTIFIKASI & BERKAS =================

app.get('/api/notifikasi', needStudent, async (c) => {
  const s = c.get('session')!
  const rows = await c.env.DB.prepare(
    'SELECT id, message, is_read, created_at FROM notifications WHERE student_id = ? ORDER BY id DESC LIMIT 25',
  )
    .bind(s.studentId!)
    .all()
  return c.json({
    items: (rows.results ?? []).map((r) => ({
      id: Number(r.id),
      message: String(r.message),
      read: !!Number(r.is_read),
      createdAt: String(r.created_at),
    })),
  })
})

app.post('/api/notifikasi/baca', needStudent, async (c) => {
  const s = c.get('session')!
  await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE student_id = ?').bind(s.studentId!).run()
  return c.json({ ok: true })
})

app.get('/api/berkas/*', needStudent, async (c) => {
  const path = c.req.path
  const key = decodeURIComponent(path.replace('/api/berkas/', ''))
  if (!key || key.includes('..')) return c.json({ error: 'Berkas tidak ditemukan.' }, 404)
  const obj = await c.env.R2.get(key)
  if (!obj) return c.json({ error: 'Berkas tidak ditemukan.' }, 404)
  const buf = await obj.arrayBuffer()
  const contentType = obj.httpMetadata?.contentType || 'application/octet-stream'
  const wanted = c.req.query('dl') === '1'
  const baseName = key.split('/').pop() || 'berkas'
  const disp = `${wanted ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(baseName)}`
  return c.body(buf, 200, { 'Content-Type': contentType, 'Content-Disposition': disp })
})

// ================= GURU =================

interface StudentStatus {
  id: number
  fullName: string
  groupName: string | null
  groupId: number | null
  pinEntered: boolean
  quizBest: number | null
  quizPassed: boolean
  interviewDone: boolean
  ineqAttempts: number
  ineqSolved: boolean
  journalCount: number
  journalToday: boolean
  portfolioDone: boolean
  reflectionDone: boolean
  lastActivity: string | null
  status: 'green' | 'yellow' | 'red'
  behind: string[]
}

async function buildStudentStatus(c: Ctx, student: StudentRow, group: GroupRow | null): Promise<StudentStatus> {
  const today = jakartaToday()
  const quiz = await quizStat(c, student.id)
  const interview = group ? await interviewLatest(c, group.id) : null
  const ineq = group ? await evaluateLatest(c, group.id) : null
  const portfolio = group
    ? await c.env.DB.prepare('SELECT id FROM portfolios WHERE group_id = ?').bind(group.id).first()
    : null
  const refl = await c.env.DB.prepare('SELECT id FROM reflections WHERE student_id = ?').bind(student.id).first()
  const jStats = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n, MAX(date(created_at, '+7 hours')) AS lastJ FROM journals WHERE student_id = ?",
  )
    .bind(student.id)
    .first()
  const lastProg = await c.env.DB.prepare(
    'SELECT MAX(updated_at) AS m FROM module_progress WHERE student_id = ?',
  )
    .bind(student.id)
    .first()
  const journalToday = String(jStats?.lastJ ?? '') === today
  const progM = lastProg?.m ? String(lastProg.m) : null
  const lastJ = jStats?.lastJ ? await c.env.DB.prepare(
    "SELECT created_at FROM journals WHERE student_id = ? ORDER BY id DESC LIMIT 1",
  ).bind(student.id).first() : null
  const candidates = [student.created_at, progM, lastJ ? String(lastJ.created_at) : null].filter(Boolean) as string[]
  const lastActivity = candidates.sort().pop() ?? student.created_at

  const behind: string[] = []
  // ekspektasi tugas bergantung pada hari proyek (1..Y)
  const period = await projectPeriod(c)
  const dayX = Math.min(Math.max(diffDays(today, period.start) + 1, 1), period.days)
  if (!group) behind.push('kelompok')
  else if (!Number(student.pin_entered)) behind.push('PIN')
  if (dayX >= 2 && !quiz.passed) behind.push('kuis')
  if (group && dayX >= 3 && !interview) behind.push('wawancara')
  if (group && dayX >= 5 && !ineq?.solved) behind.push('pertidaksamaan')
  if (!journalToday) behind.push('jurnal hari ini')
  if (group && dayX >= 7 && !portfolio) behind.push('portofolio')
  if (dayX >= 9 && !refl) behind.push('refleksi')

  let status: 'green' | 'yellow' | 'red' = 'green'
  const inactiveDays = diffDays(today, jakartaDateOf(lastActivity))
  if (behind.length >= 3 || (!group && inactiveDays >= 1) || (behind.length >= 1 && inactiveDays >= 2)) status = 'red'
  else if (behind.length >= 1) status = 'yellow'

  return {
    id: student.id,
    fullName: student.full_name,
    groupName: group?.name ?? null,
    groupId: group?.id ?? null,
    pinEntered: !!Number(student.pin_entered),
    quizBest: quiz.best,
    quizPassed: quiz.passed,
    interviewDone: !!interview,
    ineqAttempts: ineq?.attempts ?? 0,
    ineqSolved: !!ineq?.solved,
    journalCount: Number(jStats?.n ?? 0),
    journalToday,
    portfolioDone: !!portfolio,
    reflectionDone: !!refl,
    lastActivity: jakartaDateOf(lastActivity),
    status,
    behind,
  }
}

app.get('/api/guru/ringkasan', needTeacher, async (c) => {
  const students = await c.env.DB.prepare('SELECT * FROM students ORDER BY full_name').all<StudentRow>()
  const groups = await c.env.DB.prepare('SELECT * FROM groups ORDER BY id').all<GroupRow>()
  const period = await projectPeriod(c)
  const today = jakartaToday()
  const dayX = Math.min(Math.max(diffDays(today, period.start) + 1, 0), period.days)
  const quizRows = await c.env.DB.prepare(
    'SELECT student_id, MAX(score) AS best FROM quiz_results GROUP BY student_id',
  ).all()
  const bests = (quizRows.results ?? []).map((r) => Number(r.best))
  const avg = bests.length ? Math.round(bests.reduce((a, b) => a + b, 0) / bests.length) : null
  const passed = await c.env.DB.prepare('SELECT COUNT(DISTINCT student_id) AS n FROM quiz_results WHERE passed = 1').first()
  const todayJournals = await c.env.DB.prepare(
    "SELECT COUNT(DISTINCT student_id) AS n FROM journals WHERE date(created_at, '+7 hours') = ?",
  )
    .bind(today)
    .first()

  const statuses: StudentStatus[] = []
  for (const st of students.results ?? []) {
    const g = groups.results?.find((x) => x.id === st.group_id) ?? null
    statuses.push(await buildStudentStatus(c, st as StudentRow, g))
  }
  return c.json({
    totalGroups: (groups.results ?? []).length,
    totalStudents: (students.results ?? []).length,
    ungrouped: (students.results ?? []).filter((s) => !s.group_id).length,
    dayX,
    dayY: period.days,
    avgQuiz: avg,
    passedCount: Number(passed?.n ?? 0),
    journalTodayCount: Number(todayJournals?.n ?? 0),
    redCount: statuses.filter((s) => s.status === 'red').length,
    yellowCount: statuses.filter((s) => s.status === 'yellow').length,
  })
})

app.get('/api/guru/kelompok', needTeacher, async (c) => {
  const groups = await c.env.DB.prepare('SELECT * FROM groups ORDER BY id').all<GroupRow>()
  const students = await c.env.DB.prepare('SELECT * FROM students ORDER BY full_name').all<StudentRow>()
  const out = []
  for (const g of groups.results ?? []) {
    const members = (students.results ?? []).filter((s) => s.group_id === g.id)
    const statuses = []
    for (const m of members) statuses.push(await buildStudentStatus(c, m, g))
    out.push({
      id: g.id,
      name: g.name,
      pin: g.pin,
      students: statuses,
    })
  }
  const ungrouped = (students.results ?? [])
    .filter((s) => !s.group_id)
    .map((s) => ({ id: s.id, fullName: s.full_name }))
  return c.json({ groups: out, ungrouped })
})

app.get('/api/guru/siswa', needTeacher, async (c) => {
  const students = await c.env.DB.prepare('SELECT * FROM students ORDER BY created_at DESC').all<StudentRow>()
  const groups = await c.env.DB.prepare('SELECT * FROM groups ORDER BY id').all<GroupRow>()
  const out = []
  for (const st of students.results ?? []) {
    const g = groups.results?.find((x) => x.id === st.group_id) ?? null
    out.push({
      id: st.id,
      fullName: st.full_name,
      groupName: g?.name ?? null,
      groupId: st.group_id,
      pinEntered: !!Number(st.pin_entered),
      joinedAt: jakartaDateOf(st.created_at),
    })
  }
  return c.json({ students: out })
})

async function uniquePin(c: Ctx): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const pin = randomPin()
    const exists = await c.env.DB.prepare('SELECT id FROM groups WHERE pin = ?').bind(pin).first()
    if (!exists) return pin
  }
  return String(Date.now() % 10000).padStart(4, '0')
}

async function nextGroupName(c: Ctx): Promise<string> {
  const r = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM groups').first()
  const n = Number(r?.n ?? 0) + 1
  let name = `Kelompok ${n}`
  let i = n
  while (await c.env.DB.prepare('SELECT id FROM groups WHERE name = ?').bind(name).first()) {
    i++
    name = `Kelompok ${i}`
  }
  return name
}

app.post('/api/guru/kelompok', needTeacher, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const name = String(body.name ?? '').trim() || (await nextGroupName(c))
  const pin = await uniquePin(c)
  const r = await c.env.DB.prepare('INSERT INTO groups (name, pin) VALUES (?,?)').bind(name, pin).run()
  return c.json({ ok: true, id: Number(r.meta?.last_row_id ?? 0), name, pin })
})

app.post('/api/guru/kelompok/acak', needTeacher, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const perGroup = Math.max(2, Math.min(8, Number(body.perGroup) || 4))
  const rows = await c.env.DB.prepare('SELECT * FROM students WHERE group_id IS NULL ORDER BY RANDOM()').all<StudentRow>()
  const pool = [...(rows.results ?? [])]
  let created = 0
  while (pool.length > 0) {
    const chunk = pool.splice(0, perGroup)
    const name = await nextGroupName(c)
    const pin = await uniquePin(c)
    const r = await c.env.DB.prepare('INSERT INTO groups (name, pin) VALUES (?,?)').bind(name, pin).run()
    const gid = Number(r.meta?.last_row_id ?? 0)
    for (const st of chunk) {
      await c.env.DB.prepare('UPDATE students SET group_id = ? WHERE id = ?').bind(gid, st.id).run()
    }
    created++
  }
  return c.json({ ok: true, created })
})

app.post('/api/guru/kelompok/:id/anggota', needTeacher, async (c) => {
  const gid = Number(c.req.param('id'))
  const group = await c.env.DB.prepare('SELECT * FROM groups WHERE id = ?').bind(gid).first()
  if (!group) return c.json({ error: 'Kelompok tidak ditemukan.' }, 404)
  const body = await c.req.json().catch(() => ({}))
  const studentId = Number(body.studentId)
  const action = String(body.action ?? 'add')
  const student = await getStudent(c, studentId)
  if (!student) return c.json({ error: 'Siswa tidak ditemukan.' }, 404)
  if (action === 'add') {
    // bila kelompok sudah 6 anggota, tolak
    const cnt = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM students WHERE group_id = ?').bind(gid).first()
    if (Number(cnt?.n ?? 0) >= 6 && student.group_id !== gid) {
      return c.json({ error: 'Kelompok sudah penuh (maks 6 siswa).' }, 400)
    }
    await c.env.DB.prepare('UPDATE students SET group_id = ? WHERE id = ?').bind(gid, studentId).run()
  } else {
    await c.env.DB.prepare('UPDATE students SET group_id = NULL WHERE id = ?').bind(studentId).run()
  }
  return c.json({ ok: true })
})

app.post('/api/guru/kelompok/:id/pin-reset', needTeacher, async (c) => {
  const gid = Number(c.req.param('id'))
  const pin = await uniquePin(c)
  await c.env.DB.prepare('UPDATE groups SET pin = ? WHERE id = ?').bind(pin, gid).run()
  return c.json({ ok: true, pin })
})

app.delete('/api/guru/kelompok/:id', needTeacher, async (c) => {
  const gid = Number(c.req.param('id'))
  await c.env.DB.prepare('UPDATE students SET group_id = NULL WHERE group_id = ?').bind(gid).run()
  await c.env.DB.prepare('DELETE FROM groups WHERE id = ?').bind(gid).run()
  return c.json({ ok: true })
})

app.get('/api/guru/jurnal-kalender', needTeacher, async (c) => {
  const groups = await c.env.DB.prepare('SELECT * FROM groups ORDER BY id').all<GroupRow>()
  const students = await c.env.DB.prepare('SELECT * FROM students ORDER BY full_name').all<StudentRow>()
  const period = await projectPeriod(c)
  const today = jakartaToday()
  const dates: string[] = []
  for (let i = 0; i < period.days; i++) dates.push(addDays(period.start, i))
  const out = []
  for (const g of groups.results ?? []) {
    const members = (students.results ?? []).filter((s) => s.group_id === g.id)
    const rows = []
    for (const m of members) {
      const submitted = new Set(await journalDates(c, m.id))
      const joinedDate = jakartaDateOf(m.created_at)
      const days = dates.map((d) => ({
        date: d,
        status: submitted.has(d) ? ('ok' as const) : d > today ? ('future' as const) : d < joinedDate ? ('before' as const) : ('miss' as const),
      }))
      rows.push({ studentId: m.id, fullName: m.full_name, days })
    }
    out.push({ id: g.id, name: g.name, rows })
  }
  return c.json({ dates, today, project: period, groups: out })
})

app.get('/api/guru/pertidaksamaan', needTeacher, async (c) => {
  const groups = await c.env.DB.prepare('SELECT * FROM groups ORDER BY id').all<GroupRow>()
  const out = []
  for (const g of groups.results ?? []) {
    const ev = await evaluateLatest(c, g.id)
    const wrongLabels = ev.items.filter((i) => !i.correct).map((i) => i.label)
    out.push({
      id: g.id,
      name: g.name,
      attempts: ev.attempts,
      solved: ev.solved,
      summary:
        ev.attempts === 0
          ? 'Belum ada percobaan'
          : ev.solved
            ? `${ev.attempts} percobaan — semua benar ✓`
            : `${ev.attempts} percobaan, terakhir salah di: ${wrongLabels.join(', ') || '-'}`,
    })
  }
  return c.json({ groups: out })
})

app.post('/api/guru/pengingat/:studentId', needTeacher, async (c) => {
  const sid = Number(c.req.param('studentId'))
  const student = await getStudent(c, sid)
  if (!student) return c.json({ error: 'Siswa tidak ditemukan.' }, 404)
  await c.env.DB.prepare('INSERT INTO notifications (student_id, message) VALUES (?,?)').bind(
    sid,
    '🔔 Pengingat dari gurumu: ayo lengkapi tugas PjBL hari ini — cek fitur yang belum selesai ya!',
  ).run()
  return c.json({ ok: true })
})

app.get('/api/guru/pengaturan', needTeacher, async (c) => {
  const period = await projectPeriod(c)
  return c.json({ projectStart: period.start, projectDays: period.days })
})

app.post('/api/guru/pengaturan', needTeacher, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const start = String(body.projectStart ?? '')
  const days = Number(body.projectDays)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return c.json({ error: 'Tanggal mulai tidak valid.' }, 400)
  if (!(days >= 1 && days <= 60)) return c.json({ error: 'Lama proyek harus 1–60 hari.' }, 400)
  await setSetting(c, 'project_start', start)
  await setSetting(c, 'project_days', String(Math.round(days)))
  return c.json({ ok: true })
})

// ================= FALLBACK SPA DARI R2 (mode deploy manual) =================
// Dipakai bila Worker ditempel langsung lewat dashboard Cloudflare TANPA
// konfigurasi [assets] wrangler: berkas hasil build SPA disajikan dari bucket
// R2 yang terikat sebagai "WEB". Pada deploy wrangler biasa, binding WEB tidak
// ada dan rute ini otomatis dilewati (Static Assets yang bekerja).

const WEB_MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
  json: 'application/json',
  txt: 'text/plain; charset=utf-8',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  webmanifest: 'application/manifest+json',
}

app.get('*', async (c, next) => {
  const web = c.env.WEB
  if (!web || typeof web.get !== 'function') return next() // mode wrangler/assets → lewati
  const rawPath = c.req.path
  if (rawPath.startsWith('/api/')) return next() // rute API → biarkan handler 404 JSON

  let clean = rawPath
  try {
    clean = decodeURIComponent(rawPath)
  } catch {
    /* biarkan */
  }
  clean = clean.replace(/^\/+/, '') || 'index.html'
  const base = clean.split('/').pop() || clean
  // kandidat kunci: path utuh (struktur folder) lalu nama berkas saja (unggahan rata)
  const candidates: string[] = [clean]
  if (base !== clean) candidates.push(base)
  const hasExt = clean.includes('.')
  if (!hasExt && !candidates.includes('index.html')) candidates.push('index.html') // fallback SPA

  for (const key of candidates) {
    const obj = await web.get(key).catch(() => null)
    if (obj) {
      const ext = key.includes('.') ? (key.split('.').pop() ?? '').toLowerCase() : 'html'
      const buf = await obj.arrayBuffer()
      return c.body(buf, 200, {
        'Content-Type': (obj.httpMetadata?.contentType as string) || WEB_MIME[ext] || 'application/octet-stream',
        'Cache-Control': ext === 'html' ? 'no-cache' : 'public, max-age=86400',
      })
    }
  }
  return next()
})

export default app
