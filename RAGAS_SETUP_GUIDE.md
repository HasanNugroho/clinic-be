# Ragas Evaluation Setup Guide

## Overview

This guide explains how to set up and run the Ragas-based RAG evaluation system for the clinic backend.

## What is Ragas?

**Ragas** (Retrieval Augmented Generation Assessment) is a framework for evaluating RAG systems using LLM-based metrics. It provides more sophisticated evaluation than simple heuristics.

### Key Metrics

1. **Faithfulness** - How much of the response is grounded in the retrieved context
2. **Answer Relevancy** - How relevant the response is to the query
3. **Answer Correctness** - How factually correct the answer is
4. **Context Precision** - How much of the retrieved context is relevant
5. **Context Recall** - How much relevant context was retrieved

## Installation

### Option 1: Install Ragas (Recommended)

```bash
# Install Ragas and dependencies
pip install -r ragas-requirements.txt

# Or install individually
pip install ragas>=0.1.0
pip install datasets>=2.14.0
pip install huggingface-hub>=0.17.0
pip install transformers>=4.30.0
pip install torch>=2.0.0
```

### Option 2: Use Fallback Heuristic Evaluation

If you don't want to install Ragas, the script will automatically fall back to heuristic-based metrics:

```bash
# Just run the script - it will use heuristics if Ragas is not available
python3 ragas-evaluation.py
```

## Running the Evaluation

### Basic Usage

```bash
# Run evaluation with Ragas (if installed)
python3 ragas-evaluation.py

# Or with explicit Python path
python3 /home/burhan/project/personal/skripsi/clinic-be/ragas-evaluation.py
```

### Expected Output

```
✅ Ragas library loaded successfully
✅ Loaded 84 test results

🔍 Preparing dataset for Ragas evaluation...

📊 Dataset prepared with 84 samples
⏳ Running Ragas evaluation (this may take a few minutes)...

✅ Ragas evaluation complete!

=================================
📊 RAG EVALUATION SUMMARY (Ragas Metrics)
=================================
Total Evaluations: 84
Timestamp: 2026-01-01T21:40:10.479757

📈 OVERALL METRICS
---------------------------------
  Faithfulness:      0.399
  Answer Relevancy:  0.504
  Answer Correctness: 0.456
  Context Precision: 0.487
  Context Recall:    0.379
  Overall Score:     0.445

📊 METRICS BY ROLE
---------------------------------
  PATIENT (n=41)
    Faithfulness:      0.458
    ...

✅ Results exported to ragas-evaluation-results.json
✅ CSV exported to ragas-evaluation-results.csv

✨ Evaluation complete!
📄 JSON Report: ragas-evaluation-results.json
📊 CSV Report: ragas-evaluation-results.csv
```

## Output Files

### 1. ragas-evaluation-results.json
Detailed evaluation results with:
- Individual metric scores for each query
- Aggregate metrics across all queries
- Metrics broken down by user role
- Raw Ragas results

**Structure:**
```json
{
  "evaluations": [
    {
      "query": "Jam berapa klinik buka?",
      "metrics": {
        "faithfulness": 0.458,
        "answer_relevancy": 0.449,
        "answer_correctness": 0.456,
        "context_precision": 0.546,
        "context_recall": 0.395
      },
      "metadata": {
        "user_role": "patient",
        "processing_time_ms": 6286,
        "source_count": 1,
        "session_id": "...",
        "timestamp": "2026-01-01T14:15:57.440Z"
      },
      "overall_score": 0.462
    }
  ],
  "aggregate_metrics": {
    "total_evaluations": 84,
    "overall_metrics": {
      "faithfulness": 0.399,
      "answer_relevancy": 0.504,
      "answer_correctness": 0.456,
      "context_precision": 0.487,
      "context_recall": 0.379,
      "overall_score": 0.445
    },
    "by_role": {
      "patient": { ... },
      "doctor": { ... },
      "admin": { ... }
    }
  }
}
```

### 2. ragas-evaluation-results.csv
Tabular format for spreadsheet analysis:
- Query
- User Role
- All metric scores
- Processing time
- Source count
- Timestamp

### 3. RAGAS_EVALUATION_REPORT.md
Comprehensive analysis report with:
- Executive summary
- Metric explanations
- Performance by role
- Root cause analysis
- Recommendations
- Implementation roadmap

## Understanding the Metrics

### Faithfulness (0.399)
**What it measures:** How much of the generated response is supported by the retrieved documents.

**Interpretation:**
- 0.0-0.3: Low - Response contains hallucinations
- 0.3-0.6: Medium - Some hallucination present
- 0.6-1.0: High - Response is grounded in context

**Your score (0.399):** Medium - indicates some hallucination tendency

**How to improve:**
- Enforce context-only responses in prompts
- Add source attribution requirement
- Implement confidence scoring

### Answer Relevancy (0.504)
**What it measures:** How relevant the response is to the user's query.

**Interpretation:**
- 0.0-0.3: Low - Response doesn't address query
- 0.3-0.6: Medium - Response partially addresses query
- 0.6-1.0: High - Response fully addresses query

**Your score (0.504):** Medium - response addresses ~50% of query intent

**How to improve:**
- Better query understanding
- Query expansion for multi-intent queries
- Query clarification flow

### Answer Correctness (0.456)
**What it measures:** Factual correctness of the generated answer.

**Interpretation:**
- 0.0-0.3: Low - Many factual errors
- 0.3-0.6: Medium - Some factual errors
- 0.6-1.0: High - Factually correct

**Your score (0.456):** Medium - some factual accuracy issues

**How to improve:**
- Improve source quality
- Add fact-checking layer
- Use more authoritative sources

### Context Precision (0.487)
**What it measures:** How much of the retrieved context is relevant to the query.

**Interpretation:**
- 0.0-0.3: Low - Most retrieved docs are irrelevant
- 0.3-0.6: Medium - About half are relevant
- 0.6-1.0: High - Most retrieved docs are relevant

**Your score (0.487):** Medium - good filtering but room for improvement

**How to improve:**
- Fine-tune embedding model
- Implement re-ranking
- Add metadata filtering
- Increase similarity threshold

### Context Recall (0.379)
**What it measures:** How much relevant context was retrieved from the knowledge base.

**Interpretation:**
- 0.0-0.3: Low - Missing most relevant docs
- 0.3-0.6: Medium - Missing some relevant docs
- 0.6-1.0: High - Retrieved most relevant docs

**Your score (0.379):** Low - **biggest bottleneck**

**How to improve:**
- Increase retrieval depth
- Implement multi-query expansion
- Add hybrid search (BM25 + semantic)
- Improve embedding quality

## Comparing Results

### Track Progress Over Time

```bash
# Run evaluation and save with timestamp
python3 ragas-evaluation.py
mv ragas-evaluation-results.json ragas-evaluation-results-$(date +%Y%m%d-%H%M%S).json
```

### Create Comparison Report

```python
import json
import pandas as pd

# Load multiple evaluation runs
runs = []
for file in ['ragas-evaluation-results-20260101.json', 'ragas-evaluation-results-20260102.json']:
    with open(file) as f:
        runs.append(json.load(f))

# Compare overall metrics
for i, run in enumerate(runs):
    metrics = run['aggregate_metrics']['overall_metrics']
    print(f"Run {i+1}:")
    for metric, score in metrics.items():
        print(f"  {metric}: {score:.3f}")
```

## Troubleshooting

### Issue: "Ragas not installed"

**Solution:**
```bash
pip install -r ragas-requirements.txt
```

The script will automatically fall back to heuristic evaluation if Ragas is not available.

### Issue: "CUDA out of memory"

**Solution:**
```bash
# Use CPU instead
export CUDA_VISIBLE_DEVICES=""
python3 ragas-evaluation.py
```

### Issue: "Evaluation takes too long"

**Solution:**
```bash
# Evaluate subset of results
# Edit ragas-evaluation.py and modify:
# self.results = data.get("results", [])[:20]  # Only first 20
```

### Issue: "LLM API errors"

**Solution:**
```bash
# Use fallback heuristic evaluation
# The script will automatically fall back if Ragas evaluation fails
```

## Advanced Usage

### Custom Metrics Configuration

Edit the `evaluate_all()` method in `ragas-evaluation.py`:

```python
async def evaluate_all(self) -> Dict[str, Any]:
    # Customize which metrics to use
    metrics = [
        faithfulness,
        answer_relevancy,
        # Remove answer_correctness if you don't have ground truth
        context_precision,
        context_recall,
    ]
    
    results = await evaluate(
        dataset,
        metrics=metrics,
        raise_exceptions=False,
    )
```

### Batch Evaluation

```bash
# Evaluate multiple test result files
for file in rag-test-results-*.json; do
    python3 ragas-evaluation.py "$file"
done
```

### Integration with CI/CD

```yaml
# Example GitHub Actions workflow
- name: Run RAG Evaluation
  run: |
    pip install -r ragas-requirements.txt
    python3 ragas-evaluation.py
    
- name: Upload Results
  uses: actions/upload-artifact@v2
  with:
    name: ragas-results
    path: ragas-evaluation-results.*
```

## Next Steps

1. **Install Ragas:** `pip install -r ragas-requirements.txt`
2. **Run Evaluation:** `python3 ragas-evaluation.py`
3. **Review Results:** Open `RAGAS_EVALUATION_REPORT.md`
4. **Implement Improvements:** Follow the recommendations in the report
5. **Track Progress:** Run evaluation weekly and compare results

## References

- [Ragas Documentation](https://docs.ragas.io/)
- [RAG Evaluation Best Practices](https://docs.ragas.io/en/latest/concepts/metrics/)
- [Hugging Face Datasets](https://huggingface.co/docs/datasets/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the detailed report: `RAGAS_EVALUATION_REPORT.md`
3. Check Ragas documentation: https://docs.ragas.io/
