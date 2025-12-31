## BAB III

## METODE PENELITIAN

### 3.0 Jenis Penelitian dan Alur Penelitian

Bab ini menyajikan tahapan dan metode penelitian yang digunakan dalam pengembangan chatbot klinik berbasis _Retrieval-Augmented Generation_ (RAG) dengan teknologi _hybrid search_ menggunakan Qdrant. Seluruh tahapan penelitian diuraikan secara sistematis dan menggunakan bentuk kalimat pasif sesuai dengan kaidah penulisan ilmiah.

---

### 3.1 Bahan dan Data

Bahan dan data yang digunakan dalam penelitian ini merupakan data simulasi (_dummy data_) yang disusun untuk merepresentasikan kondisi operasional sebuah klinik. Seluruh data digunakan sebagai sumber pengetahuan (_knowledge base_) pada sistem _Retrieval-Augmented Generation_ (RAG). Data dikelompokkan berdasarkan koleksi MongoDB sebagai berikut:

1. **Data Pengguna (Users Collection)**
   Data pengguna mencakup informasi pasien, dokter, dan admin yang terdiri dari:
   - Informasi identitas (nama lengkap, NIK, tanggal lahir, jenis kelamin)
   - Informasi kontak (alamat, nomor telepon, email)
   - Informasi akun (role: patient/doctor/admin, password terenkripsi)
   - Informasi spesialisasi dokter (untuk role doctor)

   Data ini tidak merepresentasikan data pasien nyata dan sepenuhnya bersifat simulasi untuk kepentingan penelitian.

2. **Data Pendaftaran (Registrations Collection)**
   Data pendaftaran pasien yang mencakup:
   - Referensi pasien, dokter, dan jadwal praktik
   - Tanggal pendaftaran dan metode pendaftaran (online/offline)
   - Status pendaftaran (waiting/examining/completed/cancelled)
   - Nomor antrian untuk pasien offline

3. **Data Pemeriksaan (Examinations Collection)**
   Data hasil pemeriksaan medis yang terdiri dari:
   - Referensi pendaftaran, dokter, dan pasien
   - Tanggal pemeriksaan dan nomor pemeriksaan
   - Ringkasan diagnosis dan catatan dokter
   - Status pemeriksaan (pending/completed)

4. **Data Jadwal Dokter (Doctor Schedules Collection)**
   Data jadwal praktik dokter yang meliputi:
   - Referensi dokter
   - Hari praktik, jam mulai, dan jam selesai
   - Kuota pasien per sesi

5. **Data Dashboard (Dashboard Collection)**
   Data agregat statistik klinik harian yang mencakup:
   - Tanggal pencatatan
   - Total pasien, pendaftaran, dan status pemeriksaan
   - Statistik per dokter dan metode pendaftaran

6. **Data Informasi Klinik (Clinic Info Collection)**
   Data informasi umum klinik yang berisi:
   - Judul dan kategori informasi
   - Konten informasi (jam operasional, layanan, prosedur, dll)
   - Timestamp pembuatan

7. **Prompt dan Query Pengguna**
   Data berupa pertanyaan pengguna disusun secara manual untuk mensimulasikan interaksi pasien dengan chatbot klinik dalam berbagai skenario. Query pengguna dikategorikan berdasarkan jenis informasi yang dicari:

   a. **Query Jadwal Dokter**
   - Pertanyaan tentang ketersediaan dokter (contoh: "Ada dokter hari ini?", "Jadwal dokter spesialis jantung")
   - Pertanyaan tentang jam praktik dan kuota

   b. **Query Pendaftaran**
   - Pertanyaan tentang cara pendaftaran (contoh: "Bagaimana cara daftar?", "Prosedur pendaftaran online")
   - Pertanyaan tentang status antrian dan nomor antrian

   c. **Query Pemeriksaan**
   - Pertanyaan tentang hasil pemeriksaan (contoh: "Hasil pemeriksaan saya", "Diagnosis terakhir")
   - Pertanyaan tentang catatan dokter dan riwayat medis

   d. **Query Informasi Klinik**
   - Pertanyaan tentang layanan klinik (contoh: "Jam buka klinik", "Fasilitas yang tersedia")
   - Pertanyaan tentang prosedur dan persyaratan

   e. **Query Temporal**
   - Pertanyaan berbasis waktu (contoh: "Pemeriksaan bulan ini", "Pendaftaran minggu lalu", "Jadwal besok")
   - Sistem mengekstrak informasi temporal dan melakukan filtering berdasarkan rentang waktu

   f. **Query Kontekstual**
   - Pertanyaan follow-up yang memerlukan context dari percakapan sebelumnya
   - Sistem menggunakan conversation history dan previous topic untuk memahami konteks

   Setiap query diproses melalui sistem RAG dengan input berupa:
   - **query** (string): Pertanyaan dalam bahasa alami
   - **sessionId** (opsional): Identifier untuk melacak conversation history

   Output sistem berupa:
   - **answer**: Jawaban yang dihasilkan GPT-4o-mini dalam format natural language
   - **sources**: Array dokumen relevan dengan metadata dan skor relevansi
   - **followUpQuestion**: Pertanyaan klarifikasi jika informasi kurang lengkap
   - **suggestedFollowUps**: Saran pertanyaan lanjutan yang relevan
   - **processingTimeMs**: Waktu pemrosesan query dalam milidetik

---

### 3.2 Peralatan

Peralatan yang digunakan dalam penelitian ini terdiri dari perangkat keras (_hardware_) dan perangkat lunak (_software_) sebagai berikut:

#### 3.2.1 Perangkat Keras (Hardware)

Perangkat keras yang digunakan untuk implementasi dan pengujian sistem meliputi:

- Server pengembangan dengan spesifikasi:
  - CPU: 2 Core
  - RAM: 2 GB
  - Media penyimpanan: 40 GB SSD

- Koneksi internet untuk integrasi layanan model bahasa

#### 3.2.2 Perangkat Lunak (Software)

Perangkat lunak yang digunakan dalam penelitian ini adalah:

- **Sistem Operasi**: Linux Server
- **Framework Backend**: NestJS (Node.js framework versi 11.x)
- **Bahasa Pemrograman**: TypeScript (versi 5.7.x)
- **Database Utama**: MongoDB (untuk penyimpanan data operasional klinik)
- **Database Vektor**: Qdrant (untuk _hybrid search_ dengan dense dan sparse vectors)
- **Cache & Queue**: Redis (untuk BullMQ job queue dan caching)
- **Model Bahasa Besar**: OpenAI GPT-4o-mini melalui OpenAI API
- **Model Embedding**: OpenAI text-embedding-3-small (1536 dimensi)
- **Library Utama**:
  - `@qdrant/js-client-rest` (versi 1.16.x) - Klien Qdrant untuk hybrid search
  - `@nestjs/mongoose` (versi 11.x) - ODM MongoDB
  - `openai` (versi 6.x) - Integrasi OpenAI API
  - `@xenova/transformers` (versi 2.6.x) - Transformers untuk NLP
  - `@nestjs/bullmq` (versi 11.x) - Job queue management
  - `@nestjs/swagger` (versi 11.x) - Dokumentasi API
  - `bcrypt` (versi 6.x) - Enkripsi password
  - `passport-jwt` (versi 4.x) - Autentikasi JWT
- **Containerization**: Docker dan Docker Compose
- **API Documentation**: Swagger/OpenAPI

Seluruh perangkat lunak digunakan untuk mendukung proses pengembangan, implementasi, dan pengujian chatbot klinik berbasis RAG.

---

### 3.3 Prosedur Penelitian dan Pengumpulan Data

Prosedur penelitian dan pengumpulan data dilakukan menggunakan pendekatan simulasi sistem, mengingat penelitian ini tidak menggunakan objek klinik nyata. Tahapan yang dilakukan adalah sebagai berikut:

1. **Perancangan Skema Data**
   Skema data klinik dirancang menggunakan MongoDB dengan koleksi-koleksi yang merepresentasikan entitas klinik (users, registrations, examinations, doctorschedules, dashboards, clinicinfos). Setiap koleksi memiliki schema yang didefinisikan menggunakan Mongoose dengan validasi tipe data dan relasi antar dokumen.

2. **Generasi Data Simulasi**
   Data simulasi dibuat untuk setiap koleksi dengan menggunakan data dummy yang konsisten secara logis. Data mencakup informasi pasien, dokter, jadwal praktik, pendaftaran, pemeriksaan, dan informasi klinik.

3. **Pra-pemrosesan dan Normalisasi Data**
   Data yang telah disusun dilakukan normalisasi teks menggunakan `EmbeddingService` yang meliputi:
   - Konversi ke huruf kecil (_lowercase_)
   - Penghapusan spasi berlebih
   - Penghapusan karakter khusus kecuali tanda baca dasar
   - Pemotongan teks (_truncation_) hingga 8000 token maksimal

4. **Pembuatan Hybrid Embedding**
   Setiap dokumen diubah menjadi hybrid embedding yang terdiri dari:
   - **Dense Vector**: Dihasilkan menggunakan OpenAI text-embedding-3-small (1536 dimensi) untuk pencarian semantik
   - **Sparse Vector**: Dihasilkan menggunakan algoritma BM25 untuk pencarian leksikal berbasis kata kunci

   Proses ini dilakukan oleh `QdrantIndexingService` yang menggunakan `EmbeddingTextBuilderService` untuk membangun teks embedding dari setiap dokumen.

5. **Penyimpanan ke Database Vektor**
   Hybrid embedding disimpan ke dalam Qdrant dengan struktur:
   - ID dokumen (hash dari MongoDB ObjectId)
   - Dense vector pada named vector "dense"
   - Sparse vector pada named vector "bm25"
   - Payload berisi metadata (id, embeddingText, date)

   Setiap koleksi MongoDB memiliki collection Qdrant yang terpisah untuk isolasi data.

6. **Pengujian Sistem RAG**
   Sistem diuji menggunakan berbagai skenario pertanyaan melalui endpoint `/rag/query` untuk mengevaluasi:
   - Relevansi dokumen hasil hybrid search
   - Kualitas jawaban yang dihasilkan GPT-4o-mini
   - Waktu respons sistem
   - Akurasi filtering berdasarkan role pengguna

Variabel penelitian meliputi query pengguna, role pengguna, temporal filter, relevansi hasil pencarian, dan kualitas jawaban yang dihasilkan sistem.

---

### 3.4 Analisis dan Rancangan Sistem

#### 3.4.1 Analisis Sistem

Sistem chatbot klinik dianalisis secara deskriptif sebagai sistem yang mampu memberikan jawaban informatif berbasis data klinik melalui pendekatan RAG. Proses utama sistem meliputi penerimaan pertanyaan pengguna, pencarian data relevan menggunakan _hybrid search_, dan generasi jawaban menggunakan model bahasa besar.

#### 3.4.2 Kebutuhan Sistem

1. **Kebutuhan Fungsional**
   - Sistem mampu menerima query dari pengguna dengan session management
   - Sistem mampu melakukan autentikasi dan otorisasi berbasis JWT
   - Sistem mampu melakukan hybrid search (dense + sparse vectors) menggunakan Qdrant dengan RRF (Reciprocal Rank Fusion)
   - Sistem mampu memprediksi koleksi yang relevan berdasarkan kata kunci dalam query
   - Sistem mampu melakukan filtering data berdasarkan role pengguna (patient/doctor/admin)
   - Sistem mampu menangani temporal query (query berbasis waktu)
   - Sistem mampu menyimpan dan menggunakan conversation history untuk konteks percakapan
   - Sistem mampu menghasilkan jawaban menggunakan GPT-4o-mini dengan format JSON terstruktur
   - Sistem mampu memberikan follow-up questions dan suggested questions
   - Sistem mampu melakukan re-ranking hasil pencarian berdasarkan skor relevansi
   - Sistem mampu melakukan indexing otomatis saat data baru ditambahkan menggunakan job queue
   - Sistem menyediakan REST API dengan dokumentasi Swagger

2. **Kebutuhan Non-Fungsional**
   - **Performance**: Waktu respons query < 3 detik untuk pencarian dan generasi jawaban
   - **Scalability**: Sistem dapat menangani multiple concurrent requests menggunakan job queue
   - **Security**: Password terenkripsi dengan bcrypt, autentikasi JWT, role-based access control
   - **Reliability**: Error handling dan logging komprehensif untuk debugging
   - **Maintainability**: Kode terstruktur dengan separation of concerns (controllers, services, schemas)
   - **Usability**: API dokumentasi lengkap dengan Swagger UI
   - **Data Privacy**: Filtering data sensitif berdasarkan role pengguna

#### 3.4.3 Rancangan Sistem

Rancangan sistem dalam penelitian ini meliputi:

1. **Rancangan Arsitektur Sistem**
   Arsitektur sistem menggunakan pola **modular monolith** dengan NestJS yang terdiri dari:
   - **Presentation Layer**: REST API endpoints dengan Swagger documentation
   - **Application Layer**: Controllers (AuthController, RagController, QdrantController, dll)
   - **Business Logic Layer**: Services (RagService, QdrantService, EmbeddingService, dll)
   - **Data Access Layer**: MongoDB dengan Mongoose ODM dan Qdrant vector database
   - **Infrastructure Layer**: Redis untuk caching dan job queue, BullMQ untuk background jobs

   Komponen utama sistem:
   - **Auth Module**: Autentikasi JWT dan role-based access control
   - **RAG Module**: Orchestrasi hybrid search dan LLM generation
   - **Qdrant Module**: Manajemen vector database dan hybrid search
   - **Embedding Service**: Generasi dense dan sparse embeddings
   - **Temporal Extraction Service**: Ekstraksi informasi waktu dari query
   - **Message Builder Service**: Konstruksi prompt untuk LLM
   - **Users, Registrations, Examinations, Doctor Schedules, Dashboard, Clinic Info Modules**: CRUD operations untuk data klinik

2. **Rancangan Proses RAG**
   Alur proses sistem RAG:
   1. User mengirim query dengan sessionId (opsional)
   2. Load conversation history dan previous topic dari Redis
   3. Ekstraksi temporal information dari query
   4. Build search query dengan context dari previous query jika relevan
   5. Prediksi koleksi yang relevan berdasarkan keywords
   6. Generate hybrid embedding (dense + sparse) untuk query
   7. Parallel hybrid search ke multiple collections di Qdrant
   8. Enrich hasil Qdrant dengan data lengkap dari MongoDB
   9. Re-ranking hasil berdasarkan score (jika bukan temporal query)
   10. Build messages untuk LLM dengan system prompt, context, dan history
   11. Call GPT-4o-mini untuk generate jawaban dalam format JSON
   12. Filter sources berdasarkan sourceDocumentIds dari LLM
   13. Update topic dan save conversation history ke Redis
   14. Return response dengan answer, sources, dan metadata

3. **Rancangan Data**
   Rancangan data menggunakan:
   - **MongoDB Collections**: Relational data dengan referensi ObjectId antar collections
   - **Qdrant Collections**: Vector embeddings dengan payload metadata
   - **Redis Keys**: Session-based storage untuk conversation history, topics, dan last queries

   Relasi data:
   - Users ← Registrations → DoctorSchedules
   - Users ← Examinations → Registrations
   - Setiap dokumen MongoDB memiliki corresponding vector point di Qdrant

4. **Rancangan Hybrid Search**
   Implementasi hybrid search menggunakan:
   - **Dense Search**: Cosine similarity pada 1536-dimensional vectors
   - **Sparse Search**: BM25-based keyword matching
   - **Fusion Method**: Reciprocal Rank Fusion (RRF) dengan k=60
   - **Search Strategy**: Prefetch dari kedua vector types, kemudian merge dengan RRF
   - **Filtering**: MongoDB-style filters ditranslasi ke Qdrant query filters

5. **Rancangan API**
   REST API endpoints utama:
   - `POST /auth/login` - Autentikasi pengguna
   - `POST /auth/register` - Registrasi pengguna baru
   - `POST /rag/query` - Query chatbot dengan RAG
   - `DELETE /rag/history/:sessionId` - Clear conversation history
   - `POST /qdrant/reindex` - Reindex semua data ke Qdrant
   - `GET /qdrant/health` - Health check Qdrant collections
   - CRUD endpoints untuk setiap module (users, registrations, examinations, dll)

Beberapa alat bantu perancangan yang digunakan dalam penelitian ini antara lain diagram arsitektur sistem, flowchart proses RAG, dan ERD untuk menggambarkan relasi data.

---

Bab ini menjadi dasar implementasi dan pengujian sistem chatbot klinik yang dibahas pada bab selanjutnya.
