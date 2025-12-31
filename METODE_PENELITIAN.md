# BAB III

# METODE PENELITIAN

## 3.1 Material/Data

Penelitian ini menggunakan berbagai material dan data yang dikelompokkan berdasarkan fungsinya untuk mendukung implementasi sistem Retrieval-Augmented Generation (RAG) pada aplikasi klinik.

### 3.1.1 Data Primer

Data primer yang digunakan dalam penelitian ini meliputi:

1. **Data Pendaftaran Pasien (Registrations)**
   - Informasi pendaftaran pasien termasuk tanggal pendaftaran, metode pendaftaran, nomor antrian, dan status pendaftaran
   - Data relasi dengan dokter dan pasien
   - Keluhan awal pasien

2. **Data Pemeriksaan Medis (Examinations)**
   - Catatan hasil pemeriksaan medis
   - Diagnosis dan ringkasan diagnosis
   - Catatan dokter (doctor notes)
   - Tanggal pemeriksaan dan nomor pemeriksaan
   - Status pemeriksaan

3. **Data Jadwal Dokter (Doctor Schedules)**
   - Jadwal praktik dokter berdasarkan hari
   - Waktu mulai dan selesai praktik
   - Kuota pasien per sesi
   - Spesialisasi dokter

4. **Data Dashboard Klinik**
   - Metrik harian klinik (total pasien, total pendaftaran)
   - Statistik status pemeriksaan (selesai, menunggu, sedang diperiksa, dibatalkan)
   - Statistik metode pendaftaran
   - Statistik per dokter

### 3.1.2 Data Sekunder

Data sekunder yang digunakan meliputi:

1. **Model Embedding Pre-trained**
   - OpenAI text-embedding-3-small dengan dimensi 1536 (Neelakantan et al., 2022)
   - Biaya: $0.02 per 1 juta token

2. **Large Language Model**
   - GPT-4o-mini untuk generasi respons (OpenAI, 2024)
   - Temperature: 0.3 untuk konsistensi respons
   - Maximum tokens: 700

### 3.1.3 Dataset Pelatihan

Dataset yang digunakan untuk indexing dan retrieval mencakup:

- Total dokumen yang diindeks dari 4 koleksi MongoDB
- Format data: JSON dengan struktur terstruktur
- Preprocessing: Normalisasi teks, penghapusan karakter khusus, dan tokenisasi

## 3.2 Perangkat (Equipment)

### 3.2.1 Perangkat Keras (Hardware)

Perangkat keras yang digunakan dalam penelitian ini meliputi:

1. **Server Development**
   - Processor: Intel/AMD dengan minimal 2 cores
   - RAM: Minimal 2 GB
   - Storage: SSD dengan minimal 40 GB ruang kosong
   - Network: Koneksi internet stabil untuk akses API OpenAI

2. **Database Server**
   - MongoDB Server untuk penyimpanan data transaksional
   - Qdrant Vector Database Server untuk penyimpanan dan pencarian vektor
   - Redis Server untuk caching dan session management

### 3.2.2 Perangkat Lunak (Software)

Perangkat lunak yang digunakan beserta versi dan fungsinya:

1. **Runtime Environment**
   - Node.js v18+ sebagai runtime environment JavaScript
   - TypeScript v5.7.3 untuk type-safe development

2. **Framework dan Library Backend**
   - NestJS v11.0.1 sebagai framework backend (Kamil, 2017)
   - Express.js sebagai HTTP server (embedded dalam NestJS)
   - Mongoose v8.19.3 untuk MongoDB ODM (Object Document Mapping)

3. **Vector Database dan Search**
   - Qdrant v1.8.0+ untuk hybrid vector search (Qdrant Team, 2021)
   - @qdrant/js-client-rest v1.16.2 sebagai client library
   - Mendukung dense vectors (semantic search) dan sparse vectors (keyword search)

4. **AI/ML Services**
   - OpenAI API untuk embedding generation dan LLM
   - openai v6.9.1 sebagai SDK client

5. **Caching dan Queue Management**
   - Redis (ioredis v5.8.2) untuk session management dan caching (Sanfilippo, 2009)
   - BullMQ v5.63.0 untuk job queue management

6. **Authentication dan Security**
   - Passport.js v0.7.0 untuk authentication strategy
   - passport-jwt v4.0.1 untuk JWT authentication
   - bcrypt v6.0.0 untuk password hashing

7. **Real-time Communication**
   - Socket.io v4.7.2 untuk WebSocket communication

8. **Development Tools**
   - ESLint v9.18.0 untuk code linting
   - Prettier v3.4.2 untuk code formatting
   - Jest v30.0.0 untuk unit testing

9. **API Documentation**
   - Swagger/OpenAPI (@nestjs/swagger v11.2.3) untuk dokumentasi API

10. **Containerization**
    - Docker untuk containerization Qdrant dan Redis
    - Docker Compose untuk orchestration

11. **Code Management**
    - Git v2.42.0 untuk version control
    - GitHub untuk code repository
    - GitHub Actions untuk CI/CD pipeline

## 3.3 Prosedur dan Pengumpulan Data

### 3.3.1 Tahapan Penelitian

Penelitian ini dilakukan melalui beberapa tahapan sistematis yang dijelaskan sebagai berikut:

**Bagan Alur Penelitian:**

```
                          START
                            │
                            ▼
                  ┌──────────────────────┐
                  │ IDENTIFIKASI MASALAH │
                  │  - Analisis sistem   │
                  │    klinik existing   │
                  │  - Identifikasi      │
                  │    keterbatasan      │
                  └──────────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │  STUDI LITERATUR     │
                  │  - RAG & LLM         │
                  │  - Hybrid Search     │
                  │  - Vector Database   │
                  │  - RRF Algorithm     │
                  └──────────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │ ANALISIS KEBUTUHAN   │
                  │  - Kebutuhan         │
                  │    Fungsional        │
                  │  - Kebutuhan Non-    │
                  │    Fungsional        │
                  └──────────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │ PERANCANGAN SISTEM   │
                  │  - Arsitektur Sistem │
                  │  - Perancangan Data  │
                  │  - Perancangan Proses│
                  │  - Perancangan API   │
                  └──────────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │ PENGUMPULAN DATA     │
                  │  - Ekstraksi data    │
                  │    dari MongoDB      │
                  │  - Data Preprocessing│
                  │  - Validasi Data     │
                  └──────────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │ IMPLEMENTASI SISTEM  │
                  │  - Setup Infrastruktur│
                  │  - Backend Development│
                  │  - Integrasi API     │
                  │  - Data Indexing     │
                  └──────────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │   TESTING SISTEM     │
                  │  - Unit Testing      │
                  │  - Integration Test  │
                  │  - Performance Test  │
                  │  - UAT               │
                  └──────────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │  EVALUASI SISTEM     │
                  │  - Retrieval Metrics │
                  │  - Response Quality  │
                  │  - Performance       │
                  │  - User Feedback     │
                  └──────────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │ ANALISIS HASIL       │
                  │  - Analisis Metrik   │
                  │  - Perbandingan      │
                  │  - Identifikasi      │
                  │    Kelebihan/Kekurangan│
                  └──────────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │ DOKUMENTASI &        │
                  │ PENYUSUNAN LAPORAN   │
                  │  - Dokumentasi Teknis│
                  │  - Laporan Penelitian│
                  │  - Kesimpulan & Saran│
                  └──────────────────────┘
                            │
                            ▼
                          END
```

#### 3.3.1.1 Studi Literatur

Dilakukan kajian literatur terhadap penelitian-penelitian terkait RAG, hybrid search, dan vector databases. Literatur yang dikaji meliputi:

- Penelitian tentang Retrieval-Augmented Generation (Lewis et al., 2020)
- Hybrid search menggunakan dense dan sparse vectors (Lin et al., 2021)
- Reciprocal Rank Fusion untuk penggabungan hasil pencarian (Cormack et al., 2009)
- Vector databases dan similarity search (Johnson et al., 2019)

#### 3.3.1.2 Analisis Kebutuhan

Dilakukan analisis kebutuhan sistem melalui:

1. **Identifikasi Kebutuhan Fungsional**
   - Kemampuan menjawab pertanyaan natural language tentang data klinik
   - Pencarian semantik dan keyword-based
   - Filtering berdasarkan role pengguna (patient, doctor, admin)
   - Temporal query processing untuk pertanyaan berbasis waktu
   - Conversation history management

2. **Identifikasi Kebutuhan Non-Fungsional**
   - Response time < 3 detik untuk query
   - Akurasi retrieval dengan score threshold ≥ 0.5
   - Keamanan data dengan role-based access control
   - Skalabilitas untuk menangani pertumbuhan data

#### 3.3.1.3 Pengumpulan Data

Data dikumpulkan dari sistem klinik yang sudah berjalan dengan metode:

1. **Data Extraction**
   - Data diekstrak dari MongoDB collections
   - Validasi integritas data dan konsistensi relasi

2. **Data Preprocessing**
   - Normalisasi teks menggunakan lowercase transformation
   - Penghapusan karakter khusus kecuali tanda baca dasar
   - Collapse multiple spaces menjadi single space
   - Truncation untuk teks yang melebihi 8000 token

3. **Embedding Text Construction**
   - Konstruksi teks embedding dari field-field relevan
   - Format: "field1: value1 | field2: value2"
   - Penyertaan informasi relasi (doctor, patient) melalui MongoDB lookup

### 3.3.2 Variabel Penelitian

Variabel yang diamati dalam penelitian ini meliputi:

1. **Variabel Input**
   - Query pengguna dalam bahasa natural (string)
   - Session ID untuk conversation context
   - User context (userId, role)

2. **Variabel Proses**
   - Dense embedding vector (1536 dimensi)
   - Sparse embedding vector (variable dimensi, max 30000)
   - Similarity score (0.0 - 1.0)
   - RRF score untuk hybrid search
   - Temporal filter parameters

3. **Variabel Output**
   - Retrieved documents dengan metadata
   - Generated answer dari LLM
   - Processing time (milliseconds)
   - Follow-up questions dan suggestions
   - Conversation topic

### 3.3.3 Lokasi dan Organisasi Penelitian

Penelitian dilakukan di:

- **Lokasi**: Pengembangan dilakukan secara lokal dengan deployment ke cloud server
- **Periode**: [Sesuaikan dengan periode penelitian Anda]
- **Organisasi**: [Sesuaikan dengan institusi Anda]

## 3.4 Analisis dan Perancangan Sistem

### 3.4.1 Analisis Sistem

#### 3.4.1.1 Analisis Sistem Berjalan

Sistem klinik yang ada sebelumnya memiliki keterbatasan dalam hal:

1. Pencarian informasi yang hanya berbasis exact match
2. Tidak ada kemampuan natural language query
3. Kesulitan dalam mengakses informasi historis
4. Tidak ada context-aware conversation

#### 3.4.1.2 Analisis Sistem Usulan

Sistem RAG yang diusulkan memberikan solusi melalui:

1. **Hybrid Search Mechanism**
   - Kombinasi semantic search (dense vectors) dan keyword search (sparse vectors)
   - Menggunakan Reciprocal Rank Fusion untuk menggabungkan hasil (Cormack et al., 2009)

2. **Context-Aware Retrieval**
   - Role-based filtering untuk keamanan data
   - Temporal query processing untuk pertanyaan berbasis waktu
   - Conversation history untuk context continuity

3. **Natural Language Interface**
   - LLM-powered response generation
   - Follow-up question suggestions
   - Topic tracking untuk multi-turn conversations

### 3.4.2 Kebutuhan Sistem

#### 3.4.2.1 Kebutuhan Fungsional

1. **F-01: Query Processing**
   - Sistem dapat menerima query dalam bahasa natural
   - Sistem dapat mengekstrak informasi temporal dari query
   - Sistem dapat mempertahankan context conversation

2. **F-02: Hybrid Retrieval**
   - Sistem dapat melakukan semantic search menggunakan dense vectors
   - Sistem dapat melakukan keyword search menggunakan sparse vectors
   - Sistem dapat menggabungkan hasil dengan RRF

3. **F-03: Role-Based Access Control**
   - Sistem dapat memfilter data berdasarkan role pengguna
   - Sistem dapat menyembunyikan field sensitif sesuai role
   - Sistem dapat membatasi akses ke dokumen tertentu

4. **F-04: Response Generation**
   - Sistem dapat menghasilkan jawaban natural language
   - Sistem dapat menyediakan follow-up questions
   - Sistem dapat mendeteksi kebutuhan informasi tambahan

5. **F-05: Session Management**
   - Sistem dapat menyimpan conversation history
   - Sistem dapat melakukan topic tracking
   - Sistem dapat clear history saat diperlukan

#### 3.4.2.2 Kebutuhan Non-Fungsional

1. **NF-01: Performance**
   - Response time maksimal 3 detik untuk query
   - Throughput minimal 10 queries per detik
   - Indexing speed minimal 100 documents per detik

2. **NF-02: Accuracy**
   - Retrieval precision minimal 0.7
   - Retrieval recall minimal 0.6
   - Answer relevance score minimal 0.8

3. **NF-03: Scalability**
   - Sistem dapat menangani minimal 10,000 dokumen
   - Sistem dapat menangani 100 concurrent users
   - Horizontal scaling capability

4. **NF-04: Security**
   - Data encryption at rest dan in transit
   - JWT-based authentication
   - Role-based authorization

5. **NF-05: Availability**
   - System uptime minimal 99%
   - Graceful error handling
   - Automatic retry mechanism

### 3.4.3 Perancangan Sistem

#### 3.4.3.1 Arsitektur Sistem

Sistem RAG dirancang dengan arsitektur modular yang terdiri dari beberapa layer:

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│                   (HTTP/WebSocket Clients)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway Layer                        │
│              (NestJS Controllers + Guards)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  RAG Service │  │ Auth Service │  │ Other Services│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
┌─────────────────┐ ┌──────────────┐ ┌─────────────────┐
│ Embedding       │ │   Qdrant     │ │    MongoDB      │
│ Service         │ │   Service    │ │    Service      │
│ (OpenAI API)    │ │ (Vector DB)  │ │  (Document DB)  │
└─────────────────┘ └──────────────┘ └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Redis Service   │
                    │ (Cache & Session)│
                    └──────────────────┘
```

**Penjelasan Arsitektur:**

1. **Client Layer**: Interface pengguna yang berkomunikasi melalui HTTP REST API atau WebSocket
2. **API Gateway Layer**: Menangani routing, authentication, dan authorization
3. **Business Logic Layer**: Mengimplementasikan logika bisnis RAG dan services lainnya
4. **Data Layer**: Terdiri dari multiple data sources (Vector DB, Document DB, Cache)

#### 3.4.3.2 Perancangan Proses

**A. Flowchart Hybrid RAG Query Processing**

```
                          START
                            │
                            ▼
                  ┌──────────────────┐
                  │  Receive Query   │
                  │  + User Context  │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ Load Conversation│
                  │ History & Topic  │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │Extract Temporal  │
                  │   Information    │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  Augment Query   │
                  │  with Topic      │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │Generate Hybrid   │
                  │Embedding (Dense  │
                  │   + Sparse)      │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │Predict Relevant  │
                  │  Collections     │
                  └──────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │Has Temporal Query│    │  No Temporal     │
    │      = Yes       │    │     Query        │
    └──────────────────┘    └──────────────────┘
                │                       │
                ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │ Database-Only    │    │  Hybrid Search   │
    │ Search with      │    │  (Qdrant RRF)    │
    │ Temporal Filter  │    │  + MongoDB       │
    └──────────────────┘    └──────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
                  ┌──────────────────┐
                  │  Merge Results   │
                  │  from Multiple   │
                  │   Collections    │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │   Re-rank by     │
                  │  Score (if not   │
                  │  temporal query) │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ Build Messages   │
                  │ with Context +   │
                  │ Retrieved Docs   │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │   Call LLM API   │
                  │ (GPT-4o-mini)    │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ Parse Response   │
                  │ (Answer, Topic,  │
                  │  Follow-ups)     │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  Save History    │
                  │   & Topic to     │
                  │     Redis        │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ Return Response  │
                  │  to Client       │
                  └──────────────────┘
                            │
                            ▼
                          END
```

**B. Flowchart Indexing Process**

```
                          START
                            │
                            ▼
                  ┌──────────────────┐
                  │ Fetch Documents  │
                  │  from MongoDB    │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │   For Each       │
                  │   Document       │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ Build Embedding  │
                  │  Text from       │
                  │  Relevant Fields │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │Generate Hybrid   │
                  │Embedding:        │
                  │- Dense (OpenAI)  │
                  │- Sparse (Local)  │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  Prepare Point   │
                  │  with Vectors    │
                  │  + Payload       │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  Batch Points    │
                  │ (100 per batch)  │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ Upsert Batch to  │
                  │     Qdrant       │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  More Documents? │
                  └──────────────────┘
                    │              │
                   Yes             No
                    │              │
                    └──────┐       ▼
                           │    ┌──────────────────┐
                           │    │  Log Success     │
                           │    │  Statistics      │
                           │    └──────────────────┘
                           │              │
                           └──────────────┘
                                          ▼
                                        END
```

#### 3.4.3.3 Perancangan Data

**A. Entity Relationship Diagram (ERD)**

```
┌─────────────────┐         ┌─────────────────┐
│      User       │         │  Registration   │
├─────────────────┤         ├─────────────────┤
│ _id (PK)        │◄───────┤│ _id (PK)        │
│ fullName        │         ││ patientId (FK)  │
│ email           │         ││ doctorId (FK)   │
│ role            │         ││ registrationDate│
│ specialization  │         ││ queueNumber     │
│ ...             │         ││ status          │
└─────────────────┘         ││ ...             │
        │                   │└─────────────────┘
        │                   │         │
        │                   │         │
        │                   │         ▼
        │                   │ ┌─────────────────┐
        │                   │ │  Examination    │
        │                   │ ├─────────────────┤
        │                   └►│ _id (PK)        │
        │                     │ patientId (FK)  │
        └────────────────────►│ doctorId (FK)   │
                              │ examinationDate │
                              │ diagnosisSummary│
                              │ doctorNotes     │
                              │ ...             │
                              └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│ DoctorSchedule  │         │   Dashboard     │
├─────────────────┤         ├─────────────────┤
│ _id (PK)        │         │ _id (PK)        │
│ doctorId (FK)   │         │ date            │
│ dayOfWeek       │         │ totalPatients   │
│ startTime       │         │ totalRegistr... │
│ endTime         │         │ doctorStats[]   │
│ quota           │         │ ...             │
└─────────────────┘         └─────────────────┘
```

**B. Qdrant Vector Collection Schema**

Setiap collection di Qdrant memiliki struktur:

```typescript
{
  id: string,                    // Document ID dari MongoDB
  vector: {
    dense: number[1536],         // Dense embedding dari OpenAI
    keywords: {                  // Sparse embedding lokal
      indices: number[],
      values: number[]
    }
  },
  payload: {
    id: string,                  // Duplicate untuk filtering
    embeddingText: string,       // Teks yang di-embed
    date: Date,                  // Tanggal untuk temporal filtering
    doctorId?: string,           // Untuk role-based filtering
    patientId?: string,          // Untuk role-based filtering
    // ... field lain untuk filtering
  }
}
```

**C. Redis Data Structure**

```
1. Conversation History
   Key: "rag:conversation:{sessionId}"
   Type: JSON Array
   TTL: 86400 seconds (24 hours)
   Value: [
     { role: "user", content: "..." },
     { role: "assistant", content: "..." }
   ]

2. Conversation Topic
   Key: "ai:assistant:topic:{sessionId}"
   Type: String
   TTL: 86400 seconds (24 hours)
   Value: "topic string"
```

#### 3.4.3.4 Perancangan Algoritma

**A. Hybrid Embedding Generation**

```
Algorithm: GenerateHybridEmbedding
Input: text (string)
Output: HybridEmbedding { dense: number[], sparse: SparseVector }

1. normalizedText ← NormalizeText(text)
2. truncatedText ← TruncateText(normalizedText, 8000)

3. // Generate Dense Embedding
4. denseEmbedding ← OpenAI.Embeddings.Create({
     model: "text-embedding-3-small",
     input: truncatedText
   })

5. // Generate Sparse Embedding
6. tokens ← Tokenize(truncatedText)
7. tokenFreq ← BuildFrequencyMap(tokens)
8. sparseIndices ← []
9. sparseValues ← []

10. For each (token, freq) in tokenFreq:
11.   index ← HashToken(token) % 30000
12.   sparseIndices.append(index)
13.   sparseValues.append(sqrt(freq))
14. End For

15. // Sort by indices
16. (sparseIndices, sparseValues) ← SortByIndices(sparseIndices, sparseValues)

17. Return {
      dense: denseEmbedding,
      sparse: { indices: sparseIndices, values: sparseValues }
    }
```

**B. Reciprocal Rank Fusion (RRF)**

Qdrant mengimplementasikan RRF secara internal dengan formula (Cormack et al., 2009):

```
RRF(d) = Σ(1 / (k + rank_i(d)))

Where:
- d = document
- k = constant (default 60)
- rank_i(d) = rank of document d in result set i
- Σ = sum over all result sets (dense + sparse)
```

**C. Temporal Query Processing**

```
Algorithm: ProcessTemporalQuery
Input: query (string), temporalInfo (TemporalInfo)
Output: filteredResults (RetrievalResult[])

1. If temporalInfo.hasTemporalQuery = false:
2.   Return HybridSearch(query)
3. End If

4. dateField ← GetDateFieldForCollection(collection)
5. temporalFilter ← BuildTemporalFilter(temporalInfo)

6. // Direct database search with temporal filter
7. results ← MongoDB.Aggregate([
     { $match: { ...roleFilters, ...temporalFilter } },
     { $lookup: ... },  // Join with related collections
     { $sort: { [dateField]: temporalInfo.sortOrder } },
     { $limit: temporalInfo.limit || 25 }
   ])

8. Return results
```

**D. Role-Based Filtering**

```
Algorithm: ApplyRoleBasedFiltering
Input: collection, userContext, documents
Output: filteredDocuments

1. baseFilters ← {}

2. If userContext.role = "DOCTOR":
3.   If collection in ["registrations", "examinations"]:
4.     baseFilters.doctorId ← userContext.userId
5.   End If
6. End If

7. If userContext.role = "PATIENT":
8.   If collection in ["registrations", "examinations"]:
9.     baseFilters.patientId ← userContext.userId
10.  End If
11. End If

12. projection ← GetRoleProjection(collection, userContext.role)

13. filteredDocuments ← ApplyFiltersAndProjection(
      documents, baseFilters, projection
    )

14. Return filteredDocuments
```

#### 3.4.3.5 Perancangan Antarmuka (Interface Design)

**A. API Endpoint Design**

```
POST /api/rag/query
Request:
{
  "query": "string",
  "sessionId": "string (optional)"
}

Response:
{
  "query": "string",
  "answer": "string",
  "sources": [
    {
      "collection": "string",
      "documentId": "string",
      "snippet": "string",
      "score": number,
      "metadata": object,
      "date": "string"
    }
  ],
  "processingTimeMs": number,
  "followUpQuestion": "string (optional)",
  "needsMoreInfo": boolean,
  "suggestedFollowUps": ["string"],
  "sessionId": "string"
}
```

**B. System Interaction Diagram**

```
User → API Gateway → RAG Service → Embedding Service → OpenAI API
                          ↓
                    Qdrant Service → Qdrant Vector DB
                          ↓
                    MongoDB Service → MongoDB
                          ↓
                    Redis Service → Redis Cache
                          ↓
                    LLM Service → OpenAI API
                          ↓
                    Response → User
```

### 3.4.4 Metrik Evaluasi

Sistem dievaluasi menggunakan metrik berikut:

1. **Retrieval Metrics**
   - Precision@k: Proporsi dokumen relevan dalam top-k hasil
   - Recall@k: Proporsi dokumen relevan yang berhasil di-retrieve
   - Mean Reciprocal Rank (MRR): Rata-rata reciprocal rank dokumen relevan pertama
   - Normalized Discounted Cumulative Gain (NDCG): Metrik ranking quality

2. **Response Quality Metrics**
   - Answer Relevance: Relevansi jawaban terhadap query (human evaluation)
   - Factual Accuracy: Akurasi faktual jawaban terhadap sumber
   - Completeness: Kelengkapan informasi dalam jawaban

3. **Performance Metrics**
   - Query Latency: Waktu respons end-to-end
   - Indexing Throughput: Jumlah dokumen yang diindeks per detik
   - System Throughput: Jumlah query yang dapat ditangani per detik

4. **System Metrics**
   - Memory Usage: Penggunaan RAM
   - Storage Usage: Penggunaan disk untuk vector storage
   - API Cost: Biaya penggunaan OpenAI API

## 3.5 Implementasi Sistem

### 3.5.1 Tahapan Implementasi

Implementasi sistem dilakukan melalui tahapan berikut:

1. **Setup Infrastructure**
   - Instalasi dan konfigurasi MongoDB
   - Deployment Qdrant vector database menggunakan Docker
   - Setup Redis untuk caching dan session management
   - Konfigurasi environment variables

2. **Backend Development**
   - Implementasi NestJS modules dan services
   - Integrasi dengan OpenAI API untuk embedding dan LLM
   - Implementasi hybrid search dengan Qdrant
   - Implementasi role-based access control
   - Implementasi temporal query processing

3. **Data Indexing**
   - Batch indexing dokumen dari MongoDB ke Qdrant
   - Generasi hybrid embeddings (dense + sparse)
   - Validasi kualitas indexing

4. **Testing dan Validation**
   - Unit testing untuk individual components
   - Integration testing untuk end-to-end flow
   - Performance testing untuk latency dan throughput
   - User acceptance testing

5. **Deployment**
   - Containerization menggunakan Docker
   - Deployment ke production server
   - Monitoring dan logging setup

### 3.5.2 Teknologi Implementasi

Teknologi yang digunakan dalam implementasi:

1. **Hybrid Search Implementation**
   - Dense vectors: OpenAI text-embedding-3-small (1536 dimensi)
   - Sparse vectors: Term frequency-based dengan vocabulary size 30,000
   - Fusion: Reciprocal Rank Fusion (RRF) dengan k=60

2. **Vector Database Configuration**
   - Distance metric: Cosine similarity untuk dense vectors
   - Indexing: HNSW (Hierarchical Navigable Small World) untuk fast approximate nearest neighbor search (Malkov & Yashunin, 2018)

3. **LLM Configuration**
   - Model: GPT-4o-mini
   - Temperature: 0.3 (untuk konsistensi)
   - Max tokens: 700
   - Response format: JSON object

## Referensi

Cormack, G. V., Clarke, C. L., & Buettcher, S. (2009). Reciprocal rank fusion outperforms condorcet and individual rank learning methods. _Proceedings of the 32nd International ACM SIGIR Conference on Research and Development in Information Retrieval_, 758-759. https://doi.org/10.1145/1571941.1572114

Johnson, J., Douze, M., & Jégou, H. (2019). Billion-scale similarity search with GPUs. _IEEE Transactions on Big Data_, 7(3), 535-547. https://doi.org/10.1109/TBDATA.2019.2921572

Kamil, M. (2017). NestJS - A progressive Node.js framework. Retrieved from https://nestjs.com

Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., ... & Kiela, D. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. _Advances in Neural Information Processing Systems_, 33, 9459-9474.

Lin, J., Ma, X., Lin, S. C., Yang, J. H., Pradeep, R., & Nogueira, R. (2021). Pyserini: A Python toolkit for reproducible information retrieval research with sparse and dense representations. _Proceedings of the 44th International ACM SIGIR Conference on Research and Development in Information Retrieval_, 2356-2362. https://doi.org/10.1145/3404835.3463238

Malkov, Y. A., & Yashunin, D. A. (2018). Efficient and robust approximate nearest neighbor search using hierarchical navigable small world graphs. _IEEE Transactions on Pattern Analysis and Machine Intelligence_, 42(4), 824-836. https://doi.org/10.1109/TPAMI.2018.2889473

Neelakantan, A., Xu, T., Puri, R., Radford, A., Han, J. M., Tworek, J., ... & Zaremba, W. (2022). Text and code embeddings by contrastive pre-training. _arXiv preprint arXiv:2201.10005_.

OpenAI. (2024). GPT-4 Technical Report. _arXiv preprint arXiv:2303.08774_.

Qdrant Team. (2021). Qdrant - Vector similarity search engine. Retrieved from https://qdrant.tech

Sanfilippo, S. (2009). Redis: An open source, in-memory data structure store. Retrieved from https://redis.io
