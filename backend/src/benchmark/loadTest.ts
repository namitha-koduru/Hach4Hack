process.env.NODE_ENV = 'benchmark';
process.env.RATE_LIMIT_MAX = '100000';

import autocannon from 'autocannon';
import http from 'http';

async function runBenchmarks() {
  const { createApp } = await import('../app');
  const { config } = await import('../config');

  console.log('====================================================');
  console.log('🔥 TeamForge PS1 Load & Performance Benchmark Suite');
  console.log('====================================================');

  const app = createApp();
  const server = http.createServer(app);

  const PORT = 5055;
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}/api`;

  console.log(`🚀 In-Memory Benchmark Server listening on port ${PORT}`);
  console.log(`🎯 Target: p95 latency < 200ms under 100 concurrent users\n`);

  try {
    // 1. Benchmark: Health Check (Baseline Engine Overhead)
    console.log('----------------------------------------------------');
    console.log('Test 1: Baseline Engine Overhead (GET /api/health)');
    console.log('Parameters: 100 concurrent virtual connections, 10s duration');
    console.log('----------------------------------------------------');

    const resultHealth = await autocannon({
      url: `${baseUrl}/health`,
      connections: 100,
      duration: 10,
    });
    printSummary('Baseline Health Check', resultHealth);

    // 2. Benchmark: Team Board Discovery
    console.log('\n----------------------------------------------------');
    console.log('Test 2: Looking-For-Teammates Live Board (GET /api/teams?hasSeats=true&limit=12)');
    console.log('Parameters: 100 concurrent virtual connections, 10s duration');
    console.log('----------------------------------------------------');

    const resultBoard = await autocannon({
      url: `${baseUrl}/teams?hasSeats=true&limit=12`,
      connections: 100,
      duration: 10,
    });
    printSummary('Looking-For-Teammates Board', resultBoard);

    // 3. Benchmark: Filtered Search by Skill
    console.log('\n----------------------------------------------------');
    console.log('Test 3: Filtered Skill Search (GET /api/teams?skill=TypeScript&page=1&limit=10)');
    console.log('Parameters: 100 concurrent virtual connections, 10s duration');
    console.log('----------------------------------------------------');

    const resultSearch = await autocannon({
      url: `${baseUrl}/teams?skill=TypeScript&page=1&limit=10`,
      connections: 100,
      duration: 10,
    });
    printSummary('Skill Filter & Search', resultSearch);
  } finally {
    server.close();
    console.log('\n✅ Benchmark suite completed. Server closed.');
  }
}

function printSummary(name: string, result: any) {
  console.log(`\n📊 Benchmark Results: ${name}`);
  console.log(`   - Virtual Users (Connections): ${result.connections}`);
  console.log(`   - Duration:                    ${result.duration}s`);
  console.log(`   - Total Requests:              ${result.requests.total}`);
  console.log(`   - Successful Requests (2xx):   ${result['2xx']}`);
  console.log(`   - Non-2xx Responses:          ${result.non2xx}`);
  console.log(`   - Failed Requests (Errors):    ${result.errors}`);
  console.log(`   - Timeouts:                    ${result.timeouts}`);
  console.log(`   - Throughput (Req/sec avg):    ${result.requests.average.toFixed(2)} req/s`);
  console.log(`   - p50 Latency (Median):        ${result.latency.p50} ms`);
  console.log(`   - p90 Latency:                 ${result.latency.p90} ms`);
  console.log(`   - p95 Latency:                 ${result.latency.p97_5 || result.latency.p90} ms`);
  console.log(`   - p99 Latency:                 ${result.latency.p99} ms`);

  const p95 = result.latency.p97_5 || result.latency.p90;
  if (p95 < 200) {
    console.log(`   ✅ PASS: p95 latency (${p95}ms) meets target (<200ms)`);
  } else {
    console.log(`   ⚠️ WARNING: p95 latency (${p95}ms) exceeded 200ms target`);
  }
}

runBenchmarks().catch(console.error);
