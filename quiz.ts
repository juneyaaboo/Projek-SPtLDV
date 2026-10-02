// Bank soal kuis otomatis (Fitur 4) — tema kuliner, 10 soal pilihan ganda.
// Kunci jawaban TIDAK dikirim ke klien sebelum siswa lulus (nilai >= 70).

export interface QuizQuestion {
  id: number
  q: string
  options: string[]
  answer: number // indeks jawaban benar
  explanation: string
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 1,
    q: 'Kantin sekolah membuat kue A dan kue B. Untuk tepung: tiap kue A memakai 200 gram, tiap kue B memakai 150 gram, dan stok tepung hanya 10 kg. Jika x = banyak kue A dan y = banyak kue B, model matematikanya adalah…',
    options: [
      '200x + 150y ≤ 10.000',
      '200x + 150y ≥ 10.000',
      '200x + 150y = 10',
      '150x + 200y ≤ 10.000',
    ],
    answer: 0,
    explanation: '10 kg = 10.000 gram. Karena stok terbatas (maksimal), tanda yang tepat adalah ≤, sehingga 200x + 150y ≤ 10.000.',
  },
  {
    id: 2,
    q: 'Manakah titik yang MEMENUHI pertidaksamaan 3x + 2y ≤ 12?',
    options: ['(2, 4)', '(4, 1)', '(1, 5)', '(5, 1)'],
    answer: 0,
    explanation: 'Uji tiap titik: (2,4) → 3(2)+2(4)=14 > 12 ✗; (4,1) → 14 > 12 ✗; (1,5) → 13 > 12 ✗; (5,1)… tunggu, yang memenuhi adalah (2,4)? Mari hitung ulang: hanya titik dengan hasil ≤ 12 yang memenuhi. Jawaban benar adalah titik dengan nilai paling kecil, yaitu (2,4)? Tidak — cek opsi (1,5)=13, (4,1)=14, (5,1)=17. Jadi tidak ada yang benar? Sebenarnya (2,4)=14. Pada soal ini titik yang benar adalah (2, 4) jika soalnya 3x+2y≤14. Perhatikan penjelasan di bawah.',
    // (soal ini diperbaiki di bawah — lihat QUIZ_FINAL)
  },
  {
    id: 3,
    q: 'Saat menggambar daerah penyelesaian dari pertidaksamaan, garis batas digambar PUTUS-PUTUS jika tandanya…',
    options: ['< atau > (tanpa "sama dengan")', '≤ atau ≥', '=', '≤ atau ='],
    answer: 0,
    explanation: 'Tanda < atau > (tidak memuat "sama dengan") membuat titik pada garis TIDAK termasuk daerah penyelesaian, maka garisnya putus-putus.',
  },
  {
    id: 4,
    q: 'Daerah penyelesaian 2x + 3y ≤ 600, x ≥ 0, y ≥ 0 menggambarkan produksi roti (x) dan pastel (y). Titik berikut yang TIDAK memenuhi kendala adalah…',
    options: ['(200, 100)', '(300, 0)', '(150, 100)', '(0, 200)'],
    answer: 0,
    explanation: '2(200)+3(100) = 700 > 600 → tidak memenuhi. (300,0)=600 ✓, (150,100)=600 ✓, (0,200)=600 ✓.',
  },
  {
    id: 5,
    q: 'Daerah penyelesaian dibatasi oleh x ≥ 0, y ≥ 0, x + y ≤ 8, dan 2x + y ≤ 10. Titik pojok daerah tersebut adalah…',
    options: ['(0,0), (5,0), (2,6), (0,8)', '(0,0), (8,0), (0,8), (2,6)', '(0,0), (10,0), (0,8), (5,5)', '(0,0), (5,0), (8,2), (0,8)'],
    answer: 0,
    explanation: 'Perpotongan x+y=8 dengan 2x+y=10: kurangkan → x=2, lalu y=6 → (2,6). Titik pojok lain: (0,0), (5,0) dari 2x+y=10, dan (0,8) dari x+y=8.',
  },
  {
    id: 6,
    q: 'Harga jual kue lapis Rp15.000 (modal Rp9.000) dan risoles Rp20.000 (modal Rp13.000). Fungsi tujuan keuntungan (dalam rupiah) untuk x kue lapis dan y risoles adalah…',
    options: ['Z = 6.000x + 7.000y', 'Z = 15.000x + 20.000y', 'Z = 9.000x + 13.000y', 'Z = 35.000x + 33.000y'],
    answer: 0,
    explanation: 'Keuntungan = harga jual − modal: kue lapis 15.000−9.000 = 6.000; risoles 20.000−13.000 = 7.000. Jadi Z = 6.000x + 7.000y.',
  },
  {
    id: 7,
    q: 'Daerah layak memiliki titik pojok (0,0), (4,0), (2,2), dan (0,3). Nilai MAKSIMUM dari Z = 3x + 4y adalah…',
    options: ['14, pada (2,2)', '12, pada (4,0)', '12, pada (0,3)', '0, pada (0,0)'],
    answer: 0,
    explanation: 'Z(0,0)=0; Z(4,0)=12; Z(2,2)=3(2)+4(2)=14; Z(0,3)=12. Nilai maksimum 14 dicapai di titik pojok (2,2).',
  },
  {
    id: 8,
    q: 'x = jumlah roti dan y = jumlah pastel yang dibuat, dengan kendala x + y ≤ 50. Arti kalimat matematika itu adalah…',
    options: [
      'Jumlah roti dan pastel bersama-sama paling banyak 50 buah',
      'Jumlah roti dan pastel bersama-sama paling sedikit 50 buah',
      'Banyak roti sama dengan banyak pastel, yaitu 50',
      'Roti dikurangi pastel sebanyak 50 buah',
    ],
    answer: 0,
    explanation: 'x + y ≤ 50 berarti total (roti + pastel) tidak boleh melebihi 50 — pasokan wadah/kemasan misalnya terbatas.',
  },
  {
    id: 9,
    q: 'Mengapa model produksi selalu ditambah syarat x ≥ 0 dan y ≥ 0?',
    options: [
      'Karena banyak produk yang dibuat tidak mungkin negatif',
      'Karena grafik menjadi lebih besar',
      'Karena agar nilai Z selalu nol',
      'Karena syarat itu membuat daerah penyelesaian hilang',
    ],
    answer: 0,
    explanation: 'Jumlah kue tidak mungkin −3 buah. Syarat non-negatif membatasi daerah penyelesaian di kuadran I.',
  },
  {
    id: 10,
    q: 'Titik (0, 0) terletak DI DALAM daerah penyelesaian dari pertidaksamaan…',
    options: ['2x + y ≤ 5', 'x + y ≥ 3', 'y ≥ x + 1', '3x − y ≥ 2'],
    answer: 0,
    explanation: 'Uji (0,0): 2(0)+0 = 0 ≤ 5 ✓ memenuhi. Untuk yang lain: 0 ≥ 3 ✗, 0 ≥ 1 ✗, 0 ≥ 2 ✗ — tidak memenuhi.',
  },
]

// Soal nomor 2 dibuat konsisten (semua opsi salah kecuali satu):
QUIZ[1] = {
  id: 2,
  q: 'Manakah titik yang MEMENUHI pertidaksamaan 3x + 2y ≤ 12?',
  options: ['(1, 4)', '(2, 4)', '(4, 1)', '(5, 1)'],
  answer: 0,
  explanation: 'Uji tiap titik: (1,4) → 3(1)+2(4) = 11 ≤ 12 ✓ memenuhi. (2,4)=14 ✗, (4,1)=14 ✗, (5,1)=17 ✗.',
}
