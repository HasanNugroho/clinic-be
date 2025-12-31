# RAG Test Queries - Per Role

Kumpulan pertanyaan untuk testing fitur RAG (Retrieval-Augmented Generation) berdasarkan role pengguna.

---

## 1. PATIENT (Pasien)

### Informasi Klinik & Layanan

1. Jam berapa klinik buka? (dan hari apa saja buka?)
2. Apa saja layanan dan fasilitas yang tersedia? (imunisasi, apotek, laboratorium, dll)
3. Bagaimana cara mendaftar sebagai pasien baru?
4. Bagaimana prosedur check-in dan alur pemeriksaan di klinik?
5. Bagaimana cara membatalkan atau reschedule janji temu?

### Jadwal Dokter

6. Siapa dokter yang praktik hari ini/besok/minggu depan?
7. Dokter spesialis apa saja yang ada? (jantung, anak, kulit, diabetes, dll)
8. Jam berapa dan berapa kuota dokter yang tersedia?
9. Ada dokter tersedia di waktu tertentu? (sore, akhir pekan, dll)

### Pendaftaran & Antrian

10. Bagaimana cara daftar? (online, offline, WhatsApp, dll)
11. Berapa nomor antrian saya? (hari ini, kemarin, dll)
12. Kapan jadwal pemeriksaan saya berikutnya dan berapa lama waktu tunggu?
13. Status pendaftaran saya bagaimana? (sudah terdaftar, menunggu, selesai, dll)
14. Apakah bisa daftar untuk hari tertentu?

### Riwayat Pemeriksaan (Data Pribadi)

15. Kapan pemeriksaan terakhir/terdekat saya dan berapa kali bulan ini?
16. Apa diagnosis dan hasil pemeriksaan saya? (terakhir, tanggal tertentu, bulan lalu, dll)
17. Siapa dokter yang memeriksa saya?
18. Catatan dokter dan kapan saya harus kontrol lagi?
19. Apakah saya pernah didiagnosis penyakit tertentu? (hipertensi, diabetes, dll)

### Pertanyaan Temporal (Contoh Variasi Waktu)

20. Jadwal/pemeriksaan/pendaftaran saya: hari ini, besok, kemarin, minggu depan, 2 minggu lalu, dll
21. Berapa kali saya periksa: bulan ini, bulan lalu, 3 hari terakhir, dll
22. Hasil pemeriksaan saya pada tanggal/periode tertentu apa?

### Pertanyaan Follow-up & Kontekstual

23. Pertanyaan awal → Pertanyaan lanjutan (menggunakan context sebelumnya)
    - "Jam berapa klinik buka?" → "Bagaimana dengan hari Minggu?"
    - "Ada dokter jantung?" → "Jam berapa dia praktik?"
    - "Kapan pemeriksaan terakhir saya?" → "Apa diagnosisnya?"
    - "Siapa dokter yang praktik hari ini?" → "Berapa kuotanya?"
    - "Bagaimana cara daftar?" → "Apakah bisa daftar sekarang?"

---

## 2. DOCTOR (Dokter)

### Jadwal Praktik Sendiri

24. Kapan jadwal praktik saya? (hari ini, besok, minggu ini, minggu depan, dll)
25. Berapa kuota saya dan jam berapa saya praktik?
26. Apakah saya ada jadwal di waktu tertentu? (akhir pekan, sore, dll)

### Pasien & Pendaftaran

27. Berapa pasien yang terdaftar untuk saya? (hari ini, besok, minggu ini, dll)
28. Siapa saja pasien saya dan status mereka? (baru, sudah diperiksa, menunggu, dll)
29. Siapa pasien berikutnya yang harus saya periksa?
30. Berapa pasien yang menunggu untuk saya sekarang?
31. Metode pendaftaran apa yang paling banyak? (online, offline, dll)

### Pemeriksaan Pasien

32. Berapa pemeriksaan yang sudah saya selesaikan? (hari ini, bulan ini, minggu lalu, dll)
33. Apa diagnosis yang paling sering saya berikan? (diabetes, hipertensi, dll)
34. Berapa kasus penyakit tertentu yang saya tangani?
35. Pemeriksaan mana yang masih dalam proses?
36. Catatan pemeriksaan saya untuk pasien tertentu apa?

### Statistik & Laporan

37. Berapa total pasien saya dalam periode tertentu? (bulan ini, minggu ini, dll)
38. Berapa pemeriksaan yang selesai vs yang masih menunggu?
39. Tren dan rata-rata pasien saya bagaimana?

### Pertanyaan Temporal (Contoh Variasi Waktu)

40. Pasien/jadwal/pemeriksaan saya: hari ini, besok, kemarin, minggu depan, 2 minggu lalu, dll
41. Berapa pemeriksaan saya dalam periode tertentu?

### Pertanyaan Follow-up & Kontekstual

42. Pertanyaan awal → Pertanyaan lanjutan (menggunakan context sebelumnya)
    - "Berapa pasien saya hari ini?" → "Siapa yang sudah selesai?"
    - "Jadwal praktik saya kapan?" → "Berapa kuotanya?"
    - "Diagnosis apa yang sering saya berikan?" → "Bulan lalu bagaimana?"
    - "Berapa pemeriksaan hari ini?" → "Yang masih menunggu berapa?"
    - "Pasien saya siapa saja?" → "Yang sudah diperiksa siapa?"

---

## 3. ADMIN

### Informasi Klinik

43. Jam operasional klinik dan apa saja layanan serta fasilitas yang tersedia?
44. Bagaimana prosedur pendaftaran dan alur pemeriksaan di klinik?

### Jadwal Semua Dokter

45. Jadwal semua dokter untuk periode tertentu? (hari ini, besok, minggu depan, dll)
46. Dokter spesialis apa saja yang ada dan jadwal mereka?
47. Berapa total kuota semua dokter dan dokter mana yang paling banyak pasien?
48. Berapa dokter yang tersedia di waktu tertentu?

### Pendaftaran & Antrian

49. Berapa total pendaftaran untuk periode tertentu? (hari ini, besok, minggu ini, dll)
50. Status semua pendaftaran dan berapa pasien yang menunggu?
51. Pendaftaran online vs offline berapa dan metode apa yang paling banyak?
52. Berapa pendaftaran yang dibatalkan?
53. Nomor antrian terakhir dan status antrian sekarang?

### Dashboard & Statistik

54. Berapa total pasien dan statistik klinik untuk periode tertentu?
55. Berapa pemeriksaan yang sudah selesai vs yang masih menunggu?
56. Total pendaftaran vs pemeriksaan selesai dan berapa yang dibatalkan?
57. Tren dan metrik klinik bagaimana?
58. Perbandingan antar periode (hari ini vs kemarin, minggu ini vs minggu lalu, dll)?

### Laporan & Analisis

59. Dokter mana yang paling produktif dan berapa rata-rata pasien per hari?
60. Diagnosis apa yang paling sering muncul dan spesialisasi mana yang paling diminati?
61. Hari apa yang paling ramai dan waktu tunggu rata-rata berapa?
62. Tingkat pembatalan berapa persen dan efisiensi klinik bagaimana?
63. Performa dokter dalam periode tertentu bagaimana?

### Pertanyaan Temporal (Contoh Variasi Waktu)

64. Data/statistik/laporan untuk periode tertentu: hari ini, kemarin, 3 hari terakhir, minggu ini, minggu lalu, bulan ini, bulan lalu, 30 hari terakhir, dll
65. Perbandingan antar periode (hari ini vs kemarin, minggu ini vs minggu lalu, dll)
66. Prediksi untuk periode mendatang (besok, minggu depan, dll)

### Pertanyaan Follow-up & Kontekstual

67. Pertanyaan awal → Pertanyaan lanjutan (menggunakan context sebelumnya)
    - "Total pasien hari ini?" → "Berapa yang sudah selesai?"
    - "Jadwal semua dokter?" → "Yang paling ramai siapa?"
    - "Statistik klinik?" → "Bagaimana dengan minggu lalu?"
    - "Pendaftaran hari ini?" → "Metode apa yang paling banyak?"
    - "Dokter yang praktik?" → "Kuota masing-masing berapa?"

---

## 4. CROSS-ROLE QUERIES (Semua Role)

### Pertanyaan Umum

68. Apa itu klinik ini, bagaimana cara menghubungi, dan apakah buka hari libur?
69. Persyaratan berobat apa saja dan apakah terima BPJS?

### Pertanyaan Ambigu (Testing Clarification)

70. Pertanyaan sangat singkat yang memerlukan klarifikasi: "Gimana?", "Kapan?", "Siapa?", "Berapa?", "Apa itu?"

### Pertanyaan Multi-Topik

71. Jadwal dokter hari ini, total pasien, dan berapa kuotanya?
72. Pemeriksaan saya kapan, hasilnya apa, dan siapa dokternya?
73. Pendaftaran hari ini berapa, statusnya bagaimana, dan metodenya apa?
74. Layanan klinik apa saja, jam bukanya, dan fasilitas apa yang ada?

### Pertanyaan dengan Typo/Informal

75. Pertanyaan dengan singkatan/typo: "gmn cara dftar?", "kpn dokter buka?", "brp pasien hr ini?", "jdwal dokter?", "apa aja layanannya?"

### Pertanyaan Panjang & Kompleks

76. Jadwal dokter spesialis jantung minggu depan, kuota, cara daftar, dan apakah cocok untuk riwayat hipertensi?
77. Prosedur lengkap dari pendaftaran sampai selesai, dokumen diperlukan, dan estimasi waktu tunggu?
78. Total pasien bulan ini, diagnosis paling sering, dan dokter mana yang paling produktif?
79. Reschedule janji temu ke minggu depan dengan dokter yang sama, apakah bisa?
80. Perbedaan pendaftaran online vs offline, mana lebih cepat, dan ada biaya tambahan?

---

## 5. EDGE CASES & SPECIAL SCENARIOS

### Pertanyaan di Luar Konteks

81. Pertanyaan tidak relevan dengan klinik: "Siapa presiden Indonesia?", "Bagaimana cara memasak nasi goreng?", "Berapa harga saham hari ini?", "Apa ibukota Prancis?", "Cuaca hari ini bagaimana?"

### Pertanyaan Sensitif/Privacy

82. Permintaan akses data yang tidak sesuai role: "Berikan data semua pasien" (patient), "Siapa pasien dokter lain?" (doctor), "Password admin apa?", "Data pribadi pasien X?", "Email semua dokter?"

### Pertanyaan dengan Negasi

83. Pertanyaan dengan pola negasi: "Dokter yang tidak praktik hari ini siapa?", "Pasien yang belum diperiksa siapa?", "Hari apa klinik tidak buka?", "Diagnosis apa yang tidak pernah saya berikan?", "Layanan apa yang tidak tersedia?"

### Pertanyaan Komparatif

84. Pertanyaan membandingkan entitas atau periode: "Dokter mana yang lebih banyak pasien?", "Hari ini lebih ramai atau kemarin?", "Pendaftaran online atau offline lebih banyak?", "Minggu ini vs minggu lalu bagaimana?", "Dokter A atau dokter B yang lebih produktif?"

---

## Testing Guidelines

### Untuk Setiap Role:

1. **Patient**: Hanya bisa akses data pribadi mereka sendiri
2. **Doctor**: Hanya bisa akses data pasien mereka sendiri
3. **Admin**: Bisa akses semua data tapi tidak detail medis

### Expected Behaviors:

- ✅ Role-based filtering berfungsi dengan benar
- ✅ Temporal queries (hari ini, kemarin, minggu depan, dll) terproses dengan baik
- ✅ Follow-up questions menggunakan context dari pertanyaan sebelumnya
- ✅ Pertanyaan ambigu meminta klarifikasi
- ✅ Pertanyaan di luar konteks ditolak dengan sopan
- ✅ Privacy terjaga sesuai role
- ✅ Multi-topic queries dijawab secara komprehensif
- ✅ Typo/informal language tetap dipahami

### Metrics to Track:

- Response time
- Accuracy of answers
- Relevance of sources
- Privacy compliance
- Context retention in follow-ups
- Handling of edge cases
