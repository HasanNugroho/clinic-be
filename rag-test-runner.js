const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'https://klinikpro.click';
const TEST_QUERIES_FILE = './sample-question.json';
const RESULTS_OUTPUT_FILE = './rag-test-results.json';

// Map role names from sample-question.json to internal role names
const roleMapping = {
  'Pasien': 'patient',
  'Dokter': 'doctor',
  'Admin': 'admin',
};

// Mock user contexts for different roles
const userContexts = {
  patient: {
    userId: '6952597adb00a3e327576de3',
    role: 'patient',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvaG4uc21pdGhAZW1haWwuY29tIiwic3ViIjoiNjk1MjU5N2FkYjAwYTNlMzI3NTc2ZGUzIiwicm9sZSI6InBhdGllbnQiLCJ1c2VySWQiOiI2OTUyNTk3YWRiMDBhM2UzMjc1NzZkZTMiLCJmdWxsTmFtZSI6IkpvaG4gU21pdGgiLCJpYXQiOjE3Njc3NTczODF9.nVmOJz_R13ZHltBlNyqdSNMGLtwZx0EHlTH1bfFKgr0'
  },
  doctor: {
    userId: '69525976db00a3e327576dbf',
    role: 'doctor',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImRyLm1pY2hhZWwuZW5kb2NyaW5vbG9neUBob3NwaXRhbC5jb20iLCJzdWIiOiI2OTUyNTk3NmRiMDBhM2UzMjc1NzZkYmYiLCJyb2xlIjoiZG9jdG9yIiwidXNlcklkIjoiNjk1MjU5NzZkYjAwYTNlMzI3NTc2ZGJmIiwiZnVsbE5hbWUiOiJEci4gTWljaGFlbCBDaGVuIiwiaWF0IjoxNzY3NzU3NDM0fQ.L93kaSyHQw1YAn_3FlxkFYv24uV719atGtTgSt3Vqlw'
  },
  admin: {
    userId: '69525954db00a3e327576db8',
    role: 'admin',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGNsaW5pYy5jb20iLCJzdWIiOiI2OTUyNTk1NGRiMDBhM2UzMjc1NzZkYjgiLCJyb2xlIjoiYWRtaW4iLCJ1c2VySWQiOiI2OTUyNTk1NGRiMDBhM2UzMjc1NzZkYjgiLCJmdWxsTmFtZSI6IkFkbWluIiwiaWF0IjoxNzY3NzU3MzEzfQ.54AK5X0gsvnzn5_U9kPMP6Ct2rynr9UfOBhrQhdy9Oo'
  },
};

// Result collector
class RagTestResultCollector {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  addResult(testResult) {
    this.results.push(testResult);
  }

  getResults() {
    return {
      results: this.results,
      summary: {
        total_queries: this.results.length,
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - this.startTime,
      },
    };
  }

  getStatistics() {
    if (this.results.length === 0) {
      return {
        total_queries: 0,
        avg_processing_time_ms: 0,
        avg_retrieved_documents: 0,
        by_role: {},
      };
    }

    const stats = {
      total_queries: this.results.length,
      avg_processing_time_ms: 0,
      avg_retrieved_documents: 0,
      by_role: {},
    };

    let totalTime = 0;
    let totalDocs = 0;

    this.results.forEach((result) => {
      const role = result.metadata?.userRole || 'unknown';

      if (!stats.by_role[role]) {
        stats.by_role[role] = {
          count: 0,
          avg_processing_time_ms: 0,
          avg_retrieved_documents: 0,
        };
      }

      stats.by_role[role].count++;
      stats.by_role[role].avg_processing_time_ms += result.metadata?.processingTimeMs || 0;
      stats.by_role[role].avg_retrieved_documents += result.retrieved_documents.length;

      totalTime += result.metadata?.processingTimeMs || 0;
      totalDocs += result.retrieved_documents.length;
    });

    stats.avg_processing_time_ms = totalTime / this.results.length;
    stats.avg_retrieved_documents = totalDocs / this.results.length;

    Object.keys(stats.by_role).forEach((role) => {
      const count = stats.by_role[role].count;
      stats.by_role[role].avg_processing_time_ms /= count;
      stats.by_role[role].avg_retrieved_documents /= count;
    });

    return stats;
  }

  exportToJson() {
    return JSON.stringify(this.getResults(), null, 2);
  }

  exportToCsv() {
    if (this.results.length === 0) {
      return '';
    }

    const headers = [
      'Question ID',
      'Category',
      'Query',
      'Generated Response',
      'Retrieved Documents Count',
      'Processing Time (ms)',
      'User Role',
      'Expected Behavior',
      'Timestamp',
    ];

    const rows = this.results.map((result) => [
      result.metadata?.questionId || '',
      result.metadata?.category || '',
      `"${result.query.replace(/"/g, '""')}"`,
      `"${result.generated_response.replace(/"/g, '""')}"`,
      result.retrieved_documents.length,
      result.metadata?.processingTimeMs || 0,
      result.metadata?.userRole || 'unknown',
      `"${(result.metadata?.expectedBehavior || '').replace(/"/g, '""')}"`,
      result.metadata?.timestamp || '',
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }
}

// API Client
class RagApiClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async query(question, sessionId) {
    try {
      const response = await this.client.post('/rag/query', {
        query: question,
        sessionId,
      });
      return response.data;
    } catch (error) {
      console.error(`API Error: ${error.message}`);
      throw error;
    }
  }
}

// Map RAG response to test result format
function mapRagResponseToTestResult(query, ragResponse, userRole, questionId, category, expectedBehavior) {
  const retrievedDocuments = ragResponse.sources
    ? ragResponse.sources.map((source) => source.snippet).filter((s) => s)
    : [];

  return {
    query,
    generated_response: ragResponse.answer,
    retrieved_documents: retrievedDocuments,
    metadata: {
      processingTimeMs: ragResponse.processingTimeMs,
      sourceCount: ragResponse.sources?.length || 0,
      sessionId: ragResponse.sessionId,
      userRole,
      questionId,
      category,
      expectedBehavior,
      timestamp: new Date().toISOString(),
    },
  };
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting RAG Test Runner...\n');

  // Load test queries from sample-question.json
  let testGroups = [];
  let totalQuestions = 0;
  try {
    const fileContent = fs.readFileSync(TEST_QUERIES_FILE, 'utf-8');
    testGroups = JSON.parse(fileContent);
    
    // Count total questions
    testGroups.forEach((group) => {
      totalQuestions += group.questions.length;
    });
    
    console.log(`✅ Loaded ${testGroups.length} test groups with ${totalQuestions} total questions\n`);
  } catch (error) {
    console.error(`❌ Failed to load test queries: ${error.message}`);
    process.exit(1);
  }

  const collector = new RagTestResultCollector();
  const clients = {};

  // Initialize API clients for each role
  Object.entries(userContexts).forEach(([role, context]) => {
    clients[role] = new RagApiClient(API_BASE_URL, context.token);
  });

  // Run tests
  let successCount = 0;
  let failureCount = 0;

  // Iterate through test groups
  for (const group of testGroups) {
    const roleLabel = group.role;
    const internalRole = roleMapping[roleLabel] || roleLabel.toLowerCase();
    const client = clients[internalRole];

    if (!client) {
      console.warn(`⚠️  No client for role: ${internalRole} (${roleLabel})`);
      failureCount += group.questions.length;
      continue;
    }

    console.log(`\n📋 Testing ${roleLabel} - ${group.category}`);
    console.log('-'.repeat(60));

    // Run questions in this group
    for (const question of group.questions) {
      try {
        console.log(`[${question.id}] "${question.question}"`);
        console.log(`   Expected: ${question.expected_behavior}`);

        const ragResponse = await client.query(question.question);
        const testResult = mapRagResponseToTestResult(
          question.question,
          ragResponse.data,
          internalRole,
          question.id,
          group.category,
          question.expected_behavior
        );

        collector.addResult(testResult);
        successCount++;

        console.log(
          `   ✅ Success (${ragResponse.data.processingTimeMs}ms, ${ragResponse.data.sources?.length || 0} sources)\n`,
        );
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
        failureCount++;
      }

      // Add delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Queries: ${totalQuestions}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`Success Rate: ${((successCount / totalQuestions) * 100).toFixed(2)}%\n`);

  // Print statistics
  const stats = collector.getStatistics();
  console.log('📈 STATISTICS');
  console.log('='.repeat(60));
  console.log(`Avg Processing Time: ${stats.avg_processing_time_ms.toFixed(2)}ms`);
  console.log(`Avg Retrieved Documents: ${stats.avg_retrieved_documents.toFixed(2)}`);
  console.log('\nBy Role:');
  Object.entries(stats.by_role).forEach(([role, roleStats]) => {
    console.log(`  ${role}:`);
    console.log(`    Count: ${roleStats.count}`);
    console.log(`    Avg Time: ${roleStats.avg_processing_time_ms.toFixed(2)}ms`);
    console.log(`    Avg Docs: ${roleStats.avg_retrieved_documents.toFixed(2)}`);
  });

  // Save results
  const results = collector.getResults();
  fs.writeFileSync(RESULTS_OUTPUT_FILE, collector.exportToJson());
  console.log(`\n✅ Results saved to ${RESULTS_OUTPUT_FILE}`);

  // Save CSV
  const csvFile = RESULTS_OUTPUT_FILE.replace('.json', '.csv');
  fs.writeFileSync(csvFile, collector.exportToCsv());
  console.log(`✅ CSV saved to ${csvFile}`);

  console.log('\n✨ Test run completed!');
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
