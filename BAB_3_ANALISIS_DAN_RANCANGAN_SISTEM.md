# BAB III METODE PENELITIAN

## 3.4 Analisis dan Rancangan Sistem

### 3.4.1 Analisis Sistem

Sistem _chatbot_ klinik dianalisis secara deskriptif sebagai sistem yang mampu memberikan jawaban informatif berbasis data klinik dengan pendekatan _Retrieval-Augmented Generation_ (RAG). Proses utama sistem meliputi penerimaan pertanyaan pengguna, pencarian data relevan menggunakan _hybrid search_, dan generasi jawaban menggunakan LLM.

#### 3.4.1.1 Analisis Sistem Berjalan

Sistem klinik yang ada sebelumnya memiliki keterbatasan dalam hal:

1. Pencarian informasi yang hanya berbasis _exact match_
2. Tidak ada kemampuan _natural language query_
3. Kesulitan dalam mengakses informasi historis
4. Tidak ada _context-aware conversation_

Keterbatasan ini menyebabkan pengguna kesulitan dalam mendapatkan informasi yang relevan, terutama ketika pertanyaan diajukan dengan bahasa natural atau memerlukan konteks percakapan sebelumnya.

#### 3.4.1.2 Analisis Sistem Usulan

Sistem RAG yang diusulkan memberikan solusi melalui:

1. **Hybrid Search Mechanism**
   - Kombinasi _semantic search_ (_dense vectors_) dan _keyword search_ (_sparse vectors_)
   - Menggunakan _Reciprocal Rank Fusion_ (RRF) untuk menggabungkan hasil pencarian

2. **Context-Aware Retrieval**
   - _Role-based filtering_ untuk keamanan data
   - _Temporal query processing_ untuk pertanyaan berbasis waktu
   - _Conversation history_ untuk _context continuity_

3. **Natural Language Interface**
   - _LLM-powered response generation_ menggunakan GPT-4o-mini
   - _Follow-up question suggestions_
   - _Topic tracking_ untuk _multi-turn conversations_

### 3.4.2 Kebutuhan Sistem

#### 3.4.2.1 Kebutuhan Fungsional

1. **F-01: Query Processing**
   - Sistem mampu menerima _query_ dari pengguna dengan _session management_
   - Sistem mampu mengekstrak informasi temporal dari _query_
   - Sistem mampu mempertahankan konteks percakapan

2. **F-02: Hybrid Retrieval**
   - Sistem mampu melakukan _hybrid search_ (_dense_ + _sparse vectors_) menggunakan Qdrant dengan RRF (_Reciprocal Rank Fusion_)
   - Sistem mampu memprediksi koleksi yang relevan berdasarkan kata kunci dalam _query_
   - Sistem mampu melakukan _semantic search_ menggunakan _dense vectors_
   - Sistem mampu melakukan _keyword search_ menggunakan _sparse vectors_

3. **F-03: Role-Based Access Control**
   - Sistem mampu melakukan _filtering_ data berdasarkan _role_ pengguna (_patient_/_doctor_/_admin_)
   - Sistem mampu menyembunyikan _field_ sensitif sesuai _role_
   - Sistem mampu membatasi akses ke dokumen tertentu

4. **F-04: Response Generation**
   - Sistem mampu menghasilkan jawaban menggunakan GPT-4o-mini
   - Sistem mampu menyediakan _follow-up questions_ dan _suggested questions_
   - Sistem mampu mendeteksi kebutuhan informasi tambahan

5. **F-05: Session Management**
   - Sistem mampu menyimpan dan menggunakan _conversation history_ untuk konteks percakapan
   - Sistem mampu melakukan _topic tracking_
   - Sistem mampu _clear history_ saat diperlukan

6. **F-06: API Documentation**
   - Sistem menyediakan REST API dengan dokumentasi Swagger

#### 3.4.2.2 Kebutuhan Non-Fungsional

1. **NF-01: Performance**
   - _Response time_ kurang dari 10 detik untuk proses pencarian dan generasi jawaban
   - _Throughput_ minimal 10 _queries_ per detik
   - _Indexing speed_ minimal 100 dokumen per detik

2. **NF-02: Accuracy**
   - _Retrieval precision_ minimal 0.7
   - _Retrieval recall_ minimal 0.6
   - _Answer relevance score_ minimal 0.8

3. **NF-03: Scalability**
   - Sistem dapat menangani minimal 10,000 dokumen
   - Sistem dapat menangani 100 _concurrent users_
   - _Horizontal scaling capability_

4. **NF-04: Security**
   - Penggunaan enkripsi kata sandi
   - Autentikasi JWT
   - _Role-based access control_
   - _Data encryption at rest_ dan _in transit_

5. **NF-05: Maintainability**
   - Struktur kode yang terorganisir dengan pemisahan tanggung jawab antara _controller_, _service_, dan _schema_
   - Dokumentasi API yang lengkap dan mudah diakses melalui Swagger UI

6. **NF-06: Data Privacy**
   - Penyaringan data sensitif berdasarkan peran pengguna
   - _Graceful error handling_

### 3.4.3 Perancangan Sistem

#### 3.4.3.1 Arsitektur Sistem

Sistem RAG dirancang dengan arsitektur modular yang terdiri dari beberapa _layer_:

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

1. **Client Layer**: _Interface_ pengguna yang berkomunikasi melalui HTTP REST API atau WebSocket
2. **API Gateway Layer**: Menangani _routing_, _authentication_, dan _authorization_
3. **Business Logic Layer**: Mengimplementasikan logika bisnis RAG dan _services_ lainnya
4. **Data Layer**: Terdiri dari _multiple data sources_ (_Vector DB_, _Document DB_, _Cache_)

**Komponen Utama Sistem:**

- **NestJS Framework**: _Framework backend_ berbasis TypeScript untuk membangun API yang terstruktur dan modular
- **MongoDB Atlas**: _Database_ NoSQL berbasis _cloud_ untuk menyimpan data operasional klinik
- **Qdrant**: _Vector database_ untuk menyimpan dan mencari _embeddings_ dengan _hybrid search_
- **Redis Cloud**: _Cache_ dan _session management_ untuk menyimpan _conversation history_
- **OpenAI API**: Layanan untuk _embedding_ (text-embedding-3-small) dan LLM (GPT-4o-mini)

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

**Penjelasan Proses:**

1. **Receive Query**: Sistem menerima pertanyaan dari pengguna beserta konteks pengguna (_role_, _userId_)
2. **Load Conversation History**: Mengambil riwayat percakapan dan topik dari Redis
3. **Extract Temporal Information**: Mendeteksi apakah _query_ mengandung informasi waktu (hari ini, kemarin, minggu lalu, dll)
4. **Augment Query**: Menambahkan topik percakapan ke _query_ untuk konteks yang lebih baik
5. **Generate Hybrid Embedding**: Membuat _dense_ dan _sparse vectors_ dari _query_
6. **Predict Relevant Collections**: Memprediksi koleksi data yang relevan berdasarkan kata kunci
7. **Temporal vs Non-Temporal**: Memilih strategi pencarian berdasarkan jenis _query_
8. **Hybrid Search**: Melakukan pencarian menggunakan RRF di Qdrant
9. **Merge & Re-rank**: Menggabungkan hasil dari berbagai koleksi dan mengurutkan berdasarkan skor
10. **Build Messages**: Menyusun _prompt_ untuk LLM dengan konteks dan dokumen yang ditemukan
11. **Call LLM**: Memanggil GPT-4o-mini untuk menghasilkan jawaban
12. **Parse Response**: Mengekstrak jawaban, topik, dan _follow-up questions_
13. **Save History**: Menyimpan percakapan ke Redis
14. **Return Response**: Mengirim jawaban ke pengguna

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

**Penjelasan Proses Indexing:**

1. **Fetch Documents**: Mengambil dokumen dari MongoDB berdasarkan koleksi
2. **Build Embedding Text**: Menyusun teks dari _field_ yang relevan untuk di-_embed_
3. **Generate Hybrid Embedding**: Membuat _dense vector_ (OpenAI) dan _sparse vector_ (lokal)
4. **Prepare Point**: Menyiapkan data _point_ dengan _vectors_ dan _payload_
5. **Batch Points**: Mengelompokkan _points_ dalam _batch_ (100 dokumen per _batch_)
6. **Upsert to Qdrant**: Menyimpan _batch_ ke Qdrant
7. **Loop**: Mengulangi proses untuk semua dokumen

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

**Penjelasan ERD:**

- **User**: Menyimpan data pengguna (pasien, dokter, admin)
- **Registration**: Menyimpan data pendaftaran pasien
- **Examination**: Menyimpan data pemeriksaan dan diagnosis
- **DoctorSchedule**: Menyimpan jadwal praktik dokter
- **Dashboard**: Menyimpan data statistik dan laporan klinik

**B. Qdrant Vector Collection Schema**

Setiap koleksi di Qdrant memiliki struktur:

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
    // ... metadata lainnya
  }
}
```

**Koleksi Qdrant:**

1. **users**: _Embeddings_ dari data pengguna
2. **registrations**: _Embeddings_ dari data pendaftaran
3. **examinations**: _Embeddings_ dari data pemeriksaan
4. **doctor_schedules**: _Embeddings_ dari jadwal dokter
5. **dashboards**: _Embeddings_ dari data dashboard
6. **clinic_info**: _Embeddings_ dari informasi klinik

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

**Penjelasan Algoritma:**

- **Normalisasi**: Membersihkan teks dari karakter khusus
- **Truncate**: Membatasi panjang teks maksimal 8000 karakter
- **Dense Embedding**: Menggunakan OpenAI text-embedding-3-small (1536 dimensi)
- **Sparse Embedding**: Menggunakan _token frequency_ dengan _hashing_
- **Output**: Kombinasi _dense_ dan _sparse vectors_ untuk _hybrid search_

**B. Reciprocal Rank Fusion (RRF)**

Qdrant mengimplementasikan RRF secara internal dengan formula:

```
RRF(d) = Σ(1 / (k + rank_i(d)))

Where:
- d = document
- k = constant (default 60)
- rank_i(d) = rank of document d in result set i
- Σ = sum over all result sets (dense + sparse)
```

**Penjelasan RRF:**

RRF menggabungkan hasil dari _dense_ dan _sparse search_ dengan memberikan bobot berdasarkan peringkat dokumen di setiap hasil pencarian. Dokumen yang muncul di peringkat tinggi di kedua hasil akan mendapat skor RRF yang lebih tinggi.

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

**Penjelasan Temporal Query:**

- Mendeteksi kata kunci waktu: "hari ini", "kemarin", "minggu lalu", dll
- Mengkonversi ke _date range filter_
- Melakukan pencarian langsung di MongoDB dengan _filter_ temporal
- Mengurutkan hasil berdasarkan tanggal

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

**Penjelasan Role-Based Filtering:**

- **DOCTOR**: Hanya dapat melihat data pasien yang ditangani
- **PATIENT**: Hanya dapat melihat data diri sendiri
- **ADMIN**: Dapat melihat semua data
- _Projection_: Menyembunyikan _field_ sensitif sesuai _role_

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

**Endpoint Lainnya:**

```
POST /api/rag/clear-history
Request:
{
  "sessionId": "string"
}

Response:
{
  "success": boolean,
  "message": "string"
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

**Penjelasan Interaksi:**

1. Pengguna mengirim _query_ melalui API Gateway
2. RAG Service memproses _query_ dan memanggil Embedding Service
3. Embedding Service membuat _vectors_ menggunakan OpenAI API
4. Qdrant Service melakukan _hybrid search_ di Qdrant Vector DB
5. MongoDB Service mengambil data lengkap dari MongoDB
6. Redis Service menyimpan/mengambil _conversation history_
7. LLM Service menghasilkan jawaban menggunakan OpenAI API
8. Response dikirim kembali ke pengguna

### 3.4.4 Metrik Evaluasi

Sistem dievaluasi menggunakan metrik berikut:

#### 3.4.4.1 Retrieval Metrics

1. **Precision@k**: Proporsi dokumen relevan dalam _top-k_ hasil

   ```
   Precision@k = (Jumlah dokumen relevan dalam top-k) / k
   ```

2. **Recall@k**: Proporsi dokumen relevan yang berhasil di-_retrieve_

   ```
   Recall@k = (Jumlah dokumen relevan dalam top-k) / (Total dokumen relevan)
   ```

3. **Mean Reciprocal Rank (MRR)**: Rata-rata _reciprocal rank_ dokumen relevan pertama

   ```
   MRR = (1/n) × Σ(1/rank_i)
   ```

4. **Normalized Discounted Cumulative Gain (NDCG)**: Metrik _ranking quality_
   ```
   NDCG@k = DCG@k / IDCG@k
   ```

#### 3.4.4.2 Response Quality Metrics

1. **Answer Relevance**: Relevansi jawaban terhadap _query_ (_human evaluation_)
2. **Factual Accuracy**: Akurasi faktual jawaban terhadap sumber
3. **Completeness**: Kelengkapan informasi dalam jawaban

#### 3.4.4.3 Performance Metrics

1. **Query Latency**: Waktu respons _end-to-end_ (target < 10 detik)
2. **Indexing Throughput**: Jumlah dokumen yang diindeks per detik
3. **System Throughput**: Jumlah _query_ yang dapat ditangani per detik

#### 3.4.4.4 System Metrics

1. **Memory Usage**: Penggunaan RAM
2. **Storage Usage**: Penggunaan disk untuk _vector storage_
3. **API Cost**: Biaya penggunaan OpenAI API
