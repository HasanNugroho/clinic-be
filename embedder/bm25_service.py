from fastapi import FastAPI
from pydantic import BaseModel
from fastembed import TextEmbedding, SparseTextEmbedding 

app = FastAPI(title="BM25 & Dense Embedding Service")

# BM25 sparse embedding (Qdrant official)
bm25_model = SparseTextEmbedding("Qdrant/bm25")

# Dense embedding (sentence-transformers)
dense_model = TextEmbedding("sentence-transformers/all-MiniLM-L6-v2")

class TextInput(BaseModel):
    text: str

@app.post("/embed")
def embed(input: TextInput):
    """Generate BM25 sparse embedding"""
    vector = next(bm25_model.embed(input.text))
    return {
        "indices": vector.indices.tolist(),
        "values": vector.values.tolist(),
    }

@app.post("/embed-dense")
def embed_dense(input: TextInput):
    """Generate dense embedding using sentence-transformers"""
    vector = next(dense_model.embed(input.text))
    return {
        "embedding": vector.tolist(),
    }

@app.post("/embed-hybrid")
def embed_hybrid(input: TextInput):
    """Generate both sparse (BM25) and dense embeddings"""
    sparse_vector = next(bm25_model.embed(input.text))
    dense_vector = next(dense_model.embed(input.text))
    
    return {
        "sparse": {
            "indices": sparse_vector.indices.tolist(),
            "values": sparse_vector.values.tolist(),
        },
        "dense": dense_vector.tolist(),
    }

@app.get("/health")
def health():
    return {"status": "ok"}
