# RAG Testing Guide

## Overview

File `rag-test-runner.js` adalah script untuk menjalankan automated testing pada RAG API dan mengumpulkan hasil dalam format yang terstruktur.

## Setup

### 1. Install Dependencies

```bash
npm install axios
```

### 2. Environment Variables

Buat file `.env` atau set environment variables:

```bash
API_URL=http://localhost:3000/api
PATIENT_TOKEN=your-patient-token
DOCTOR_TOKEN=your-doctor-token
ADMIN_TOKEN=your-admin-token
```

Atau gunakan default (untuk development):

```bash
node rag-test-runner.js
```

## Running Tests

### Basic Usage

```bash
node rag-test-runner.js
```

### Output

Script akan menghasilkan:

1. **Console Output**: Progress dan summary
2. **rag-test-results.json**: Hasil testing dalam format JSON
3. **rag-test-results.csv**: Hasil testing dalam format CSV

## Output Format

### JSON Result Structure

```json
{
  "results": [
    {
      "query": "Jam berapa klinik buka?",
      "generated_response": "Klinik buka pada jam 08:00 sampai 17:00",
      "retrieved_documents": ["Jam operasional klinik adalah 08:00 - 17:00 setiap hari kerja"],
      "metadata": {
        "processingTimeMs": 245,
        "sourceCount": 1,
        "sessionId": "abc-123",
        "userRole": "patient",
        "timestamp": "2025-12-31T22:54:00.000Z"
      }
    }
  ],
  "summary": {
    "total_queries": 84,
    "timestamp": "2025-12-31T22:54:30.000Z",
    "duration_ms": 8450
  }
}
```

### CSV Format

```csv
Query,Generated Response,Retrieved Documents Count,Processing Time (ms),User Role,Timestamp
"Jam berapa klinik buka?","Klinik buka pada jam 08:00 sampai 17:00",1,245,patient,2025-12-31T22:54:00.000Z
```

## Statistics Output

Script menampilkan statistik real-time:

```
📊 TEST SUMMARY
============================================================
Total Queries: 84
✅ Success: 82
❌ Failed: 2
Success Rate: 97.62%

📈 STATISTICS
============================================================
Avg Processing Time: 245.32ms
Avg Retrieved Documents: 2.15

By Role:
  patient:
    Count: 23
    Avg Time: 240.15ms
    Avg Docs: 2.10
  doctor:
    Count: 19
    Avg Time: 250.30ms
    Avg Docs: 2.50
  admin:
    Count: 25
    Avg Time: 245.80ms
    Avg Docs: 2.40
```

## Test Query Format

Test queries diambil dari `rag-test-queries-simple.json`:

```json
{
  "id": 1,
  "role": "patient",
  "category": "clinic_info",
  "question": "Jam berapa klinik buka?"
}
```

- `role`: patient, doctor, admin, atau all
- `category`: Kategori pertanyaan untuk filtering
- `question`: Pertanyaan yang akan ditest

## Customization

### Mengubah Test Queries

Edit `rag-test-queries-simple.json` untuk menambah/mengubah pertanyaan.

### Mengubah API Endpoint

Ubah `API_BASE_URL` di `rag-test-runner.js`:

```javascript
const API_BASE_URL = 'http://your-api-url/api';
```

### Mengubah Output File

Ubah `RESULTS_OUTPUT_FILE`:

```javascript
const RESULTS_OUTPUT_FILE = './my-results.json';
```

## Integration dengan Testing Framework

### Menggunakan Jest

```javascript
const { RagTestResultCollector } = require('./rag-test-runner');

describe('RAG Testing', () => {
  let collector;

  beforeEach(() => {
    collector = new RagTestResultCollector();
  });

  test('should return valid response format', async () => {
    const result = {
      query: 'Test query',
      generated_response: 'Test response',
      retrieved_documents: ['Doc 1'],
      metadata: { processingTimeMs: 100, userRole: 'patient' },
    };

    collector.addResult(result);
    const results = collector.getResults();

    expect(results.results).toHaveLength(1);
    expect(results.summary.total_queries).toBe(1);
  });
});
```

### Menggunakan Mocha

```javascript
const assert = require('assert');
const { RagTestResultCollector } = require('./rag-test-runner');

describe('RAG Results', () => {
  it('should collect results correctly', () => {
    const collector = new RagTestResultCollector();
    const result = {
      query: 'Test',
      generated_response: 'Response',
      retrieved_documents: [],
      metadata: { processingTimeMs: 100, userRole: 'patient' },
    };

    collector.addResult(result);
    assert.strictEqual(collector.getResults().results.length, 1);
  });
});
```

## Troubleshooting

### API Connection Error

```
❌ Failed: connect ECONNREFUSED 127.0.0.1:3000
```

**Solution**: Pastikan API server berjalan di port 3000 atau ubah `API_BASE_URL`.

### Authentication Error

```
❌ Failed: 401 Unauthorized
```

**Solution**: Pastikan token valid di environment variables.

### File Not Found

```
❌ Failed to load test queries: ENOENT: no such file or directory
```

**Solution**: Pastikan `rag-test-queries-simple.json` ada di direktori yang sama.

## Advanced Usage

### Filtering Results

```javascript
const results = collector.getResults();
const patientResults = results.results.filter((r) => r.metadata.userRole === 'patient');
```

### Getting Statistics

```javascript
const stats = collector.getStatistics();
console.log(`Average response time: ${stats.avg_processing_time_ms}ms`);
console.log(`Average documents retrieved: ${stats.avg_retrieved_documents}`);
```

### Exporting Results

```javascript
// JSON
const json = collector.exportToJson();
fs.writeFileSync('results.json', json);

// CSV
const csv = collector.exportToCsv();
fs.writeFileSync('results.csv', csv);
```

## Performance Considerations

- Script menambahkan delay 100ms antar request untuk menghindari rate limiting
- Untuk testing besar, pertimbangkan untuk menjalankan dalam batch terpisah
- Monitor memory usage untuk test set yang sangat besar

## Next Steps

1. Jalankan test runner: `node rag-test-runner.js`
2. Analisis hasil di `rag-test-results.json`
3. Bandingkan statistik antar role
4. Identifikasi bottleneck dan optimize
