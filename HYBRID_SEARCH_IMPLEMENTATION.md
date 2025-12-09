# Qdrant Hybrid Search Implementation

## Overview

Updated Qdrant integration to support **hybrid search** combining both **dense vectors** (semantic/semantic similarity) and **sparse vectors** (keyword/lexical matching) using Reciprocal Rank Fusion (RRF) for result merging.

## Architecture

### 1. Dense Vectors (Semantic Search)
- **Model**: OpenAI `text-embedding-3-small`
- **Dimensions**: 1536
- **Distance Metric**: Cosine similarity
- **Purpose**: Semantic understanding and contextual relevance

### 2. Sparse Vectors (Keyword Search)
- **Type**: Term frequency-based sparse vectors
- **Vocabulary Size**: 30,000 indices
- **Encoding**: Hash-based token to index mapping
- **Values**: Square root of term frequency (TF)
- **Purpose**: Exact keyword and lexical matching

### 3. Result Merging
- **Algorithm**: Reciprocal Rank Fusion (RRF)
- **Formula**: RRF(d) = Σ(1 / (k + rank(d))) where k=60
- **Benefit**: Combines semantic and lexical relevance scores

## Implementation Details

### EmbeddingService Updates

#### New Interfaces
```typescript
export interface SparseVector {
    indices: number[];
    values: number[];
}

export interface HybridEmbedding {
    dense: number[];
    sparse: SparseVector;
}
```

#### New Methods

**`generateHybridEmbedding(text: string): Promise<HybridEmbedding>`**
- Generates both dense and sparse embeddings from input text
- Returns combined hybrid embedding object
- Handles text normalization and truncation

**`generateSparseEmbedding(text: string): SparseVector`** (Private)
- Tokenizes text into words
- Builds term frequency map
- Converts tokens to indices using hash function
- Returns sparse vector with indices and values

**`hashToken(token: string): number`** (Private)
- Simple hash function for consistent token-to-index mapping
- Ensures reproducible sparse vector generation

### QdrantService Updates

#### Collection Creation
```typescript
// Collections now created with both dense and sparse vectors
await this.client.createCollection(collectionName, {
    vectors: {
        dense: {
            size: 1536,
            distance: 'Cosine',
        },
    },
    sparse_vectors: {
        sparse: {},
    },
});
```

#### Search Method
**Signature Change**:
```typescript
async search(
    collectionName: string,
    denseVector: number[],
    limit: number = 10,
    scoreThreshold: number = 0.5,
    filters?: Record<string, any>,
    sparseVector?: { indices: number[]; values: number[] },
): Promise<QdrantSearchResponse[]>
```

**Search Flow**:
1. Dense vector search (semantic similarity)
2. Sparse vector search (keyword matching) - if sparse vector provided
3. Merge results using RRF if both searches performed
4. Return top-k results

### QdrantIndexingService Updates

All indexing methods now generate hybrid embeddings:

**Dashboard Indexing**:
```typescript
const hybridEmbedding = await this.embeddingService.generateHybridEmbedding(embeddingText);
points.push({
    id: dashboard._id.toString(),
    vector: {
        dense: hybridEmbedding.dense,
        sparse: hybridEmbedding.sparse,
    },
    payload: { /* ... */ },
});
```

Same pattern applied to:
- `indexRegistration()`
- `indexExamination()`
- `indexSchedule()`

### RagService Updates

**Hybrid Retrieval Flow**:
```typescript
// Generate hybrid embedding for query
const hybridEmbedding = await this.embeddingService.generateHybridEmbedding(query);

// Search with both dense and sparse vectors
const qdrantResults = await this.qdrantService.search(
    qdrantCollection,
    hybridEmbedding.dense,
    15,
    0.5,
    mongoFilters,
    hybridEmbedding.sparse
);
```

## Benefits

### 1. Semantic + Lexical Matching
- **Semantic**: Understands meaning and context
- **Lexical**: Catches exact keyword matches
- **Combined**: Best of both approaches

### 2. Improved Relevance
- Semantic search alone may miss exact keyword matches
- Keyword search alone may miss contextually relevant results
- RRF merging balances both approaches

### 3. Better User Experience
- More relevant results for natural language queries
- Better handling of domain-specific terminology
- Improved recall for specific searches

## Performance Considerations

### Indexing Cost
- **Dense Embedding**: ~$0.02 per 1M tokens (OpenAI)
- **Sparse Embedding**: Local computation (free)
- **Total**: Minimal additional cost

### Search Performance
- Dense search: Fast (vector index)
- Sparse search: Moderate (term-based index)
- RRF merging: O(n log n) for sorting

### Storage
- Dense vectors: 1536 dimensions × 4 bytes = ~6KB per document
- Sparse vectors: Variable (typically 50-200 non-zero terms)
- Total: ~10-15KB per document

## Configuration

### Environment Variables
```bash
OPENAI_API_KEY=sk-...
QDRANT_URL=http://localhost:6333
```

### Qdrant Server
- Requires Qdrant v1.8.0+ for sparse vector support
- Docker: `docker run -p 6333:6333 qdrant/qdrant`

## Migration Guide

### For Existing Collections

1. **Delete old collections** (dense-only):
   ```bash
   POST /qdrant/reindex
   ```

2. **Recreate with hybrid support**:
   - Collections automatically created with sparse vector support
   - Existing data will be reindexed with hybrid embeddings

3. **Verify**:
   ```bash
   GET /qdrant/health
   ```

## Testing

### Test Hybrid Search
```typescript
// Dense-only search (fallback)
const results1 = await qdrantService.search(
    'examinations',
    denseVector,
    10,
    0.5
);

// Hybrid search (dense + sparse)
const results2 = await qdrantService.search(
    'examinations',
    denseVector,
    10,
    0.5,
    filters,
    sparseVector
);

// Results should be more relevant with hybrid approach
```

## Future Enhancements

1. **Weighted RRF**: Adjust weights between dense and sparse results
2. **BM25 Scoring**: Replace TF with BM25 for sparse vectors
3. **Query Expansion**: Expand queries with synonyms before embedding
4. **Caching**: Cache embeddings for frequently searched terms
5. **Analytics**: Track which search type (dense/sparse) performs better

## Troubleshooting

### Issue: Sparse vectors not being used
- **Check**: Ensure `sparseVector` parameter is provided to search
- **Fix**: Verify `generateHybridEmbedding()` returns valid sparse vector

### Issue: Poor search results
- **Check**: Verify both dense and sparse embeddings are generated
- **Fix**: Adjust RRF constant (k=60) or score threshold

### Issue: Slow indexing
- **Check**: Sparse embedding generation is local (should be fast)
- **Fix**: Batch size may be too large; reduce BATCH_SIZE in indexing

## References

- [Qdrant Hybrid Search](https://qdrant.tech/documentation/concepts/hybrid-queries/)
- [Reciprocal Rank Fusion](https://en.wikipedia.org/wiki/Reciprocal_rank_fusion)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
