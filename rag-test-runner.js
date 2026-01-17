const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'https://api.klinikpro.click';
const TEST_QUERIES_FILE = './question.json';
const RESULTS_OUTPUT_FILE = './rag-test-results.json';

// Role mapping is now direct from question.json
const roleMapping = {
  patient: 'patient',
  doctor: 'doctor',
  admin: 'admin',
};

// Mock user contexts for different roles
const userContexts = {
  patient: {
    userId: '6952597adb00a3e327576de3',
    role: 'patient',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImpvaG4uc21pdGhAZW1haWwuY29tIiwic3ViIjoiNjk1MjU5N2FkYjAwYTNlMzI3NTc2ZGUzIiwicm9sZSI6InBhdGllbnQiLCJ1c2VySWQiOiI2OTUyNTk3YWRiMDBhM2UzMjc1NzZkZTMiLCJmdWxsTmFtZSI6IkpvaG4gU21pdGgiLCJpYXQiOjE3Njg2NTU0NjN9.0mSSbVvnNDcH7UopOvzW8Lngn0gnX6E7xVPhbSxB6jM',
  },
  doctor: {
    userId: '69525976db00a3e327576dbf',
    role: 'doctor',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImRyLm1pY2hhZWwuZW5kb2NyaW5vbG9neUBob3NwaXRhbC5jb20iLCJzdWIiOiI2OTUyNTk3NmRiMDBhM2UzMjc1NzZkYmYiLCJyb2xlIjoiZG9jdG9yIiwidXNlcklkIjoiNjk1MjU5NzZkYjAwYTNlMzI3NTc2ZGJmIiwiZnVsbE5hbWUiOiJEci4gTWljaGFlbCBDaGVuIiwiaWF0IjoxNzY4NjU1NDMyfQ.CY52RC3LO8LDDWqCw5QaRfoodWbwShsUEq_nemQ0D-8',
  },
  admin: {
    userId: '69525954db00a3e327576db8',
    role: 'admin',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGNsaW5pYy5jb20iLCJzdWIiOiI2OTUyNTk1NGRiMDBhM2UzMjc1NzZkYjgiLCJyb2xlIjoiYWRtaW4iLCJ1c2VySWQiOiI2OTUyNTk1NGRiMDBhM2UzMjc1NzZkYjgiLCJmdWxsTmFtZSI6IkFkbWluIiwiaWF0IjoxNzY4NjU1MTg2fQ.v5yLBTZvfZI7wmb3zpslJvG3ZSXv7Eua6xH2anq-Psw',
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
      'Scenario ID',
      'Turn',
      'Category',
      'Query',
      'Generated Response',
      'Retrieved Documents Count',
      'Response Time (ms)',
      'Processing Time (ms)',
      'User Role',
      'Expected Behavior',
      'Session ID',
      'Timestamp',
    ];

    const rows = this.results.map((result) => [
      result.metadata?.scenarioId || '',
      result.metadata?.turn || '',
      result.metadata?.category || '',
      `"${result.query.replace(/"/g, '""')}"`,
      `"${result.generated_response.replace(/"/g, '""')}"`,
      result.retrieved_documents.length,
      result.metadata?.responseTimeMs || 0,
      result.metadata?.processingTimeMs || 0,
      result.metadata?.userRole || 'unknown',
      `"${(result.metadata?.expectedBehavior || '').replace(/"/g, '""')}"`,
      result.metadata?.sessionId || '',
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
      const startTime = Date.now();
      const response = await this.client.post('/rag/query', {
        query: question,
        sessionId,
      });
      const responseTimeMs = Date.now() - startTime;
      return { data: response.data, responseTimeMs };
    } catch (error) {
      console.error(`API Error: ${error.message}`);
      throw error;
    }
  }
}

// Map RAG response to test result format
function mapRagResponseToTestResult(
  query,
  ragResponse,
  userRole,
  scenarioId,
  turn,
  category,
  expectedBehavior,
  responseTimeMs,
) {
  const responseData = ragResponse.data || ragResponse;
  const retrievedDocuments = responseData.sources
    ? responseData.sources.map((source) => source.snippet).filter((s) => s)
    : [];

  return {
    query,
    generated_response: responseData.answer,
    retrieved_documents: retrievedDocuments,
    metadata: {
      processingTimeMs: responseData.processingTimeMs,
      responseTimeMs,
      sourceCount: responseData.sources?.length || 0,
      sessionId: responseData.sessionId,
      userRole,
      scenarioId,
      turn,
      category: category.join(', '),
      expectedBehavior,
      timestamp: new Date().toISOString(),
    },
  };
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting RAG Test Runner...\n');

  // Load test scenarios from question.json
  let testData = null;
  let totalQuestions = 0;
  try {
    const fileContent = fs.readFileSync(TEST_QUERIES_FILE, 'utf-8');
    testData = JSON.parse(fileContent);
    const scenarios = testData.test_scenarios;

    // Count total questions
    scenarios.forEach((scenario) => {
      totalQuestions += scenario.questions.length;
    });

    console.log(
      `✅ Loaded ${scenarios.length} test scenarios with ${totalQuestions} total questions\n`,
    );
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

  // Iterate through test scenarios
  for (const scenario of testData.test_scenarios) {
    const roleLabel = Array.isArray(scenario.role) ? scenario.role[0] : scenario.role;
    const internalRole = roleMapping[roleLabel] || roleLabel.toLowerCase();
    const client = clients[internalRole];

    if (!client) {
      console.warn(`⚠️  No client for role: ${internalRole} (${roleLabel})`);
      failureCount += scenario.questions.length;
      continue;
    }

    console.log(`\n📋 Scenario ${scenario.scenario_id}: ${scenario.scenario_name}`);
    console.log(`   Role: ${roleLabel} | Categories: ${scenario.categories.join(', ')}`);
    console.log('-'.repeat(60));

    // Use a unique session ID for each scenario to maintain conversation context
    const sessionId = `test-${scenario.scenario_id}-${Date.now()}`;

    // Run questions in this scenario sequentially to maintain context
    for (const question of scenario.questions) {
      try {
        console.log(`[Turn ${question.turn}] "${question.input}"`);
        console.log(`   Expected: ${question.expected_behavior}`);

        const { data: apiResponse, responseTimeMs } = await client.query(question.input, sessionId);
        const ragResponse = apiResponse.data || apiResponse;
        const testResult = mapRagResponseToTestResult(
          question.input,
          ragResponse,
          internalRole,
          scenario.scenario_id,
          question.turn,
          scenario.categories,
          question.expected_behavior,
          responseTimeMs,
        );

        collector.addResult(testResult);
        successCount++;

        console.log(
          `   ✅ Success (Response: ${responseTimeMs}ms, Processing: ${ragResponse.processingTimeMs}ms, ${ragResponse.sources?.length || 0} sources)\n`,
        );
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
        failureCount++;
      }

      // Add delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Longer delay between scenarios
    await new Promise((resolve) => setTimeout(resolve, 1000));
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
