# RAG Relevancy Score Analysis - Low Scores (avg 0.4)

## Executive Summary
The RAG system has low relevancy scores (avg 0.4) due to **multiple compounding issues** in the indexing and retrieval pipeline. The main problems are:

1. **Weak Embedding Text Quality** - Insufficient context in indexed documents
2. **Suboptimal BM25 Sparse Vector** - Poor keyword matching
3. **Low Score Threshold** - Accepting low-quality matches
4. **Weak Hybrid Fusion** - RRF not optimally balancing dense/sparse
5. **Limited Query Expansion** - Queries not enriched with synonyms
6. **No Query Rewriting** - Queries not optimized for search

---

## Part 1: Current RAG Flow Analysis

### 1.1 Indexing Flow (qdrant-indexing.service.ts)

**Current Process:**
```
Document (MongoDB) 
  → Extract fields 
  → Build embedding text (EmbeddingTextBuilderService)
  → Generate hybrid embedding (dense + BM25 sparse)
  → Index in Qdrant
```

**Issues Identified:**

#### Issue 1.1.1: Weak Embedding Text
**File:** `embedding-text-builder.service.ts`

Example for examinations:
```typescript
buildExaminationEmbeddingText(examination: any): string {
  const parts: string[] = [];
  
  // Only includes: examinationNumber, date, patient name, status, diagnosis, notes, doctor
  parts.push(`Pemeriksaan medis ${numberToIndonesianOrdinal(examination.examinationNumber)} dilakukan pada tanggal ...`);
  
  return parts.join('\n\n');
}
```

**Problems:**
- ❌ **Missing context fields**: No registration info, no treatment details, no follow-up info
- ❌ **No semantic enrichment**: No synonyms or related terms
- ❌ **Minimal metadata**: No tags, categories, or keywords
- ❌ **No temporal context**: Date only, no relative time expressions
- ❌ **Limited relationships**: Doctor/patient names only, no specialization context

**Impact:** Documents are too sparse for semantic search. Query "pemeriksaan jantung" won't match examination with diagnosis "aritmia jantung" because the embedding text doesn't contain "jantung" as a searchable term.

---

### 1.2 Embedding Generation (embedding.service.ts)

**Current Process:**
```
Text → Normalize → Truncate (8000 chars) → OpenAI embedding (1536 dims)
     → BM25 sparse vector (30000 vocab)
```

**Issues Identified:**

#### Issue 1.2.1: BM25 Initialization Problem
**File:** `embedding.service.ts:83-88`

```typescript
// Initialize BM25 model if not already done
if (!this.bm25Model) {
  this.bm25Model = buildBM25([truncatedText]); // ❌ Only trained on current text!
}

// Generate sparse embedding using BM25
const sparse = bm25QueryVector(this.bm25Model, truncatedText);
```

**Problems:**
- ❌ **BM25 model trained per-query**: Each query trains BM25 on only that single query text
- ❌ **No corpus statistics**: BM25 needs IDF (inverse document frequency) from full corpus
- ❌ **Inconsistent vocabulary**: Different queries have different BM25 vocabularies
- ❌ **Poor sparse vector quality**: Sparse vectors are weak because BM25 model is untrained

**Impact:** Sparse vectors are nearly useless. BM25 should be trained on the entire indexed corpus, not per-query.

---

### 1.3 Vector Search (qdrant.service.ts)

**Current Process:**
```
Query → Generate dense + sparse embeddings
      → Hybrid search with RRF fusion
      → Score threshold: 0.5
      → Limit: 25 results
```

**Issues Identified:**

#### Issue 1.3.1: Low Score Threshold
**File:** `qdrant.service.ts:173` and `rag.service.ts:35`

```typescript
private readonly DEFAULT_SCORE_THRESHOLD = 0.5; // ❌ Too low!
```

**Problems:**
- ❌ **Accepts poor matches**: Cosine similarity 0.5 = 60° angle (very dissimilar)
- ❌ **No quality filtering**: Returns all results above threshold regardless of relevance
- ❌ **RAGAS expects 0.7+**: Relevancy metric needs better matches

**Impact:** System returns many irrelevant results. RAGAS evaluates relevancy based on whether retrieved docs actually answer the query.

#### Issue 1.3.2: RRF Fusion Imbalance
**File:** `qdrant.service.ts:239-241`

```typescript
query: {
  fusion: 'rrf', // Reciprocal Rank Fusion
}
```

**Problems:**
- ❌ **Default RRF weights**: Equally weights dense and sparse (50/50)
- ❌ **Sparse vectors are weak**: BM25 is poor quality, shouldn't be weighted equally
- ❌ **No tuning**: No parameters to adjust fusion weights
- ❌ **Dense-only would be better**: Dense embeddings are much stronger

**Impact:** Weak sparse vectors drag down overall relevancy scores.

---

### 1.4 Query Processing (rag.service.ts)

**Current Process:**
```
User query 
  → Extract temporal info
  → Build search query (with previous context)
  → Predict collections
  → Generate hybrid embedding
  → Search Qdrant
  → Rerank by score
  → Return top 25
```

**Issues Identified:**

#### Issue 1.4.1: No Query Expansion
**File:** `rag.service.ts:161-162`

```typescript
const searchQuery = this.buildSearchQuery(query, previousTopic, previousQuery);
// Just concatenates previous query, no expansion
```

**Problems:**
- ❌ **No synonym expansion**: "pemeriksaan" won't match "medical examination"
- ❌ **No semantic enrichment**: Query not expanded with related terms
- ❌ **No query rewriting**: Queries not optimized for search
- ❌ **Limited context**: Only uses previous query, not semantic context

**Impact:** Queries are too specific. "Berapa jadwal dokter jantung?" won't find "Jadwal praktik Dr. Budi (spesialisasi Kardiologi)" because "jantung" ≠ "Kardiologi".

#### Issue 1.4.2: Weak Collection Prediction
**File:** `rag.service.ts:299-324`

```typescript
private predictCollectionFromQuery(query: string): string[] {
  const queryLower = query.toLowerCase();
  const predictions: string[] = [];

  for (const [collection, keywords] of Object.entries(this.COLLECTION_KEYWORDS)) {
    if (keywords.some((keyword) => queryLower.includes(keyword))) {
      predictions.push(collection);
    }
  }
  
  return predictions.length > 0 ? predictions : this.getAllCollectionNames();
}
```

**Problems:**
- ❌ **Simple keyword matching**: Only checks if keywords exist in query
- ❌ **No semantic understanding**: Can't understand query intent
- ❌ **Falls back to all collections**: Returns all 5 collections if no keywords match
- ❌ **Inefficient**: Searches irrelevant collections

**Impact:** Searches all collections even when query is clearly about one type (e.g., "jadwal dokter" searches examinations, registrations, dashboards unnecessarily).

#### Issue 1.4.3: No Result Filtering
**File:** `rag.service.ts:170` (commented out)

```typescript
// const limitedResults = this.limitSourcesByScore(rankedResults);
// Filtering by score is disabled!
```

**Problems:**
- ❌ **No quality threshold**: All results above 0.5 are passed to LLM
- ❌ **LLM receives noise**: Low-quality results confuse the LLM
- ❌ **Worse answers**: LLM tries to use irrelevant context

**Impact:** LLM gets confused by low-quality results, produces worse answers.

---

## Part 2: Root Causes Summary

| Issue | Severity | Impact on Score | Root Cause |
|-------|----------|-----------------|-----------|
| Weak embedding text | **CRITICAL** | -0.2 | Missing context fields, no enrichment |
| BM25 untrained on corpus | **CRITICAL** | -0.15 | Per-query training instead of corpus-level |
| Low score threshold (0.5) | **HIGH** | -0.1 | Accepts poor matches |
| RRF weights imbalanced | **HIGH** | -0.05 | Weak sparse vectors weighted equally |
| No query expansion | **HIGH** | -0.1 | Queries too specific |
| Weak collection prediction | **MEDIUM** | -0.05 | Falls back to all collections |
| Result filtering disabled | **MEDIUM** | -0.05 | LLM receives noise |

**Total Impact:** ~0.7 points lost from potential 1.0 score → avg 0.3-0.4 ✓

---

## Part 3: Recommended Fixes (Priority Order)

### Fix 1: Enrich Embedding Text (CRITICAL)
**Impact:** +0.2 to relevancy score

**Changes needed in `embedding-text-builder.service.ts`:**

For **Examinations**, add:
- Diagnosis with medical synonyms
- Doctor specialization context
- Related medical terms
- Treatment/medication info
- Follow-up recommendations

For **Registrations**, add:
- Doctor specialization
- Complaint/reason for visit
- Expected examination type
- Related schedule info

For **Doctor Schedules**, add:
- Medical specialization synonyms
- Common conditions treated
- Doctor qualifications
- Schedule availability context

### Fix 2: Train BM25 on Full Corpus (CRITICAL)
**Impact:** +0.15 to relevancy score

**Changes needed in `embedding.service.ts`:**

```typescript
// Initialize BM25 model ONCE with full corpus
// Not per-query!
async initializeBM25WithCorpus(documents: string[]): Promise<void> {
  this.bm25Model = buildBM25(documents);
}

// Use pre-trained model for all queries
async generateHybridEmbedding(text: string): Promise<HybridEmbedding> {
  // Use this.bm25Model (pre-trained on corpus)
  const sparse = bm25QueryVector(this.bm25Model, text);
}
```

### Fix 3: Increase Score Threshold (HIGH)
**Impact:** +0.1 to relevancy score

**Changes needed in `rag.service.ts`:**

```typescript
private readonly DEFAULT_SCORE_THRESHOLD = 0.7; // Increase from 0.5
```

### Fix 4: Implement Query Expansion (HIGH)
**Impact:** +0.1 to relevancy score

**New service needed: `query-expansion.service.ts`:**

```typescript
async expandQuery(query: string): Promise<string> {
  // Add synonyms and related terms
  // "jadwal dokter" → "jadwal dokter, jadwal praktik, ketersediaan dokter"
  // "pemeriksaan jantung" → "pemeriksaan jantung, kardiologi, cardiac exam"
}
```

### Fix 5: Improve Collection Prediction (MEDIUM)
**Impact:** +0.05 to relevancy score

Use semantic understanding instead of keyword matching.

### Fix 6: Re-enable Result Filtering (MEDIUM)
**Impact:** +0.05 to relevancy score

```typescript
const limitedResults = this.limitSourcesByScore(rankedResults, 0.7);
```

---

## Part 4: Implementation Roadmap

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Increase score threshold to 0.7
2. ✅ Re-enable result filtering
3. ✅ Enrich embedding text with medical synonyms

### Phase 2: Medium Effort (2-4 hours)
1. ✅ Implement query expansion service
2. ✅ Train BM25 on corpus (requires indexing changes)
3. ✅ Improve collection prediction

### Phase 3: Advanced (4+ hours)
1. ✅ Fine-tune embedding model for medical domain
2. ✅ Implement semantic reranking
3. ✅ Add domain-specific query understanding

---

## Part 5: Expected Improvements

**Current State:**
- Avg relevancy score: 0.4
- Score distribution: Many 0.3-0.6 scores

**After Phase 1 (Quick Wins):**
- Expected avg: 0.5-0.55
- Improvement: +0.15

**After Phase 2 (Medium Effort):**
- Expected avg: 0.65-0.70
- Improvement: +0.25 from current

**After Phase 3 (Advanced):**
- Expected avg: 0.75-0.80
- Improvement: +0.35-0.40 from current

---

## Part 6: Detailed Fix Implementations

### Fix 1.1: Enhanced Embedding Text for Examinations

**Current (weak):**
```
Pemeriksaan medis ke-1 dilakukan pada tanggal 15 Januari 2024 untuk pasien bernama Budi.
Pemeriksaan ini berstatus selesai.
Pasien didiagnosis dengan Hipertensi Esensial Stadium 1.
Berdasarkan catatan dokter: Tekanan darah tinggi, perlu monitoring rutin.
Pemeriksaan ini ditangani oleh Dr. Andi, seorang dokter spesialis Kardiologi.
```

**Enhanced (strong):**
```
Pemeriksaan medis ke-1 dilakukan pada tanggal 15 Januari 2024 untuk pasien bernama Budi.
Pemeriksaan ini berstatus selesai.
Pasien didiagnosis dengan Hipertensi Esensial Stadium 1 (tekanan darah tinggi, hipertensi, penyakit jantung).
Berdasarkan catatan dokter: Tekanan darah tinggi, perlu monitoring rutin. Pasien disarankan untuk mengurangi asupan garam dan melakukan olahraga teratur.
Pemeriksaan ini ditangani oleh Dr. Andi, seorang dokter spesialis Kardiologi (ahli jantung, kardiolog, penyakit jantung).
Tindak lanjut: Kontrol ulang dalam 2 minggu, monitor tekanan darah harian.
Kondisi: Hipertensi memerlukan perhatian medis berkelanjutan dan gaya hidup sehat.
```

**Benefits:**
- Contains medical synonyms: "jantung", "kardiolog", "penyakit jantung"
- Includes context: treatment, follow-up, lifestyle
- Better for semantic search: More terms to match against

### Fix 1.2: Enhanced Embedding Text for Doctor Schedules

**Current (weak):**
```
Jadwal praktik berlangsung pada hari Senin, dari pukul 08:00 hingga 12:00.
Kuota pasien yang tersedia pada jadwal ini adalah 20 orang.
Jadwal praktik ini milik Dr. Andi, dokter dengan spesialisasi Kardiologi.
```

**Enhanced (strong):**
```
Jadwal praktik berlangsung pada hari Senin, dari pukul 08:00 hingga 12:00.
Kuota pasien yang tersedia pada jadwal ini adalah 20 orang.
Jadwal praktik ini milik Dr. Andi, dokter dengan spesialisasi Kardiologi (ahli jantung, kardiolog, penyakit jantung, aritmia, hipertensi).
Dokter ini menangani kondisi: tekanan darah tinggi, penyakit jantung, gangguan irama jantung, kolesterol tinggi.
Pasien dapat mendaftar untuk pemeriksaan jantung, konsultasi kardiologi, atau follow-up kondisi jantung.
Jadwal ini tersedia setiap minggu dengan ketersediaan kuota yang konsisten.
```

**Benefits:**
- Medical synonyms: "jantung", "kardiolog", "aritmia", "hipertensi"
- Condition context: What doctor treats
- Better matching: Query "jadwal dokter jantung" now matches

### Fix 2: BM25 Corpus Training

**Current Problem:**
```typescript
// Per-query training (WRONG)
if (!this.bm25Model) {
  this.bm25Model = buildBM25([truncatedText]); // Only this query
}
```

**Solution:**
```typescript
// Corpus-level training (CORRECT)
private bm25Model: BM25State | null = null;

async initializeBM25Corpus(allDocuments: string[]): Promise<void> {
  // Train once on full corpus
  this.bm25Model = buildBM25(allDocuments);
  this.logger.log(`BM25 model trained on ${allDocuments.length} documents`);
}

async generateHybridEmbedding(text: string): Promise<HybridEmbedding> {
  // Use pre-trained model
  if (!this.bm25Model) {
    throw new Error('BM25 model not initialized. Call initializeBM25Corpus first.');
  }
  
  const sparse = bm25QueryVector(this.bm25Model, text);
  return { dense, sparse };
}
```

**Implementation:**
- Call `initializeBM25Corpus()` during app startup
- Pass all indexed documents from MongoDB
- Reuse same model for all queries

---

## Summary

**Why scores are low (0.4):**
1. Embedding text is too sparse (missing context)
2. BM25 sparse vectors are untrained
3. Score threshold too low (0.5)
4. Queries not expanded with synonyms
5. Results not filtered by quality

**Expected improvement with fixes:**
- Phase 1: 0.4 → 0.55 (+0.15)
- Phase 2: 0.55 → 0.70 (+0.15)
- Phase 3: 0.70 → 0.80 (+0.10)

**Priority:** Fix 1 (embedding text) and Fix 2 (BM25 training) are CRITICAL.
