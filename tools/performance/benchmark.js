/**
 * Performance Benchmark Tool
 * Runs comprehensive performance tests and benchmarks
 */

const autocannon = require('autocannon');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

class PerformanceBenchmark {
  constructor() {
    this.results = {};
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  }

  // Run API endpoint benchmarks
  async benchmarkAPI() {
    console.log('🚀 Starting API performance benchmarks...');
    
    const endpoints = [
      { name: 'Health Check', url: '/health', method: 'GET' },
      { name: 'Products List', url: '/api/products?limit=50', method: 'GET' },
      { name: 'Product Detail', url: '/api/products/1', method: 'GET' },
      { name: 'Inventory Status', url: '/api/inventory/status', method: 'GET' },
      { name: 'Dashboard Analytics', url: '/api/analytics/dashboard', method: 'GET' },
      { name: 'User Authentication', url: '/api/auth/verify', method: 'POST', body: { token: 'test-token' } }
    ];
    
    const benchmarkResults = {};
    
    for (const endpoint of endpoints) {
      console.log(`\n📊 Benchmarking: ${endpoint.name}`);
      
      const options = {
        url: `${this.baseUrl}${endpoint.url}`,
        connections: 10,
        pipelining: 1,
        duration: 30, // 30 seconds
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      };
      
      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }
      
      try {
        const result = await autocannon(options);
        benchmarkResults[endpoint.name] = {
          url: endpoint.url,
          method: endpoint.method,
          requests: result.requests,
          latency: result.latency,
          throughput: result.throughput,
          errors: result.errors,
          timeouts: result.timeouts,
          duration: result.duration
        };
        
        console.log(`✅ ${endpoint.name}: ${result.requests.average} req/sec, ${result.latency.average}ms avg latency`);
      } catch (error) {
        console.error(`❌ Failed to benchmark ${endpoint.name}:`, error.message);
        benchmarkResults[endpoint.name] = { error: error.message };
      }
    }
    
    this.results.api = benchmarkResults;
    return benchmarkResults;
  }

  // Benchmark database operations
  async benchmarkDatabase() {
    console.log('\n🗄️  Starting database performance benchmarks...');
    
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'inventory_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    });
    
    const queries = [
      {
        name: 'Simple Select',
        query: 'SELECT COUNT(*) FROM products WHERE status = $1',
        params: ['active']
      },
      {
        name: 'Complex Join',
        query: `
          SELECT p.name, c.name as category, i.quantity 
          FROM products p 
          JOIN categories c ON p.category_id = c.id 
          JOIN inventory i ON p.id = i.product_id 
          WHERE p.status = $1 
          LIMIT 100
        `,
        params: ['active']
      },
      {
        name: 'Aggregation Query',
        query: `
          SELECT c.name, COUNT(p.id) as product_count, AVG(p.price) as avg_price
          FROM categories c
          LEFT JOIN products p ON c.id = p.category_id
          WHERE p.status = $1
          GROUP BY c.id, c.name
          ORDER BY product_count DESC
        `,
        params: ['active']
      },
      {
        name: 'Inventory Low Stock',
        query: `
          SELECT p.name, i.quantity, i.reorder_level
          FROM products p
          JOIN inventory i ON p.id = i.product_id
          WHERE i.quantity <= i.reorder_level
          ORDER BY (i.quantity::float / i.reorder_level) ASC
          LIMIT 50
        `,
        params: []
      }
    ];
    
    const dbResults = {};
    
    for (const queryTest of queries) {
      console.log(`📊 Benchmarking: ${queryTest.name}`);
      
      const iterations = 100;
      const times = [];
      
      try {
        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          await pool.query(queryTest.query, queryTest.params);
          const end = performance.now();
          times.push(end - start);
        }
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
        
        dbResults[queryTest.name] = {
          iterations,
          averageTime: avgTime,
          minTime,
          maxTime,
          p95Time,
          query: queryTest.query
        };
        
        console.log(`✅ ${queryTest.name}: ${avgTime.toFixed(2)}ms avg, ${p95Time.toFixed(2)}ms p95`);
      } catch (error) {
        console.error(`❌ Failed to benchmark ${queryTest.name}:`, error.message);
        dbResults[queryTest.name] = { error: error.message };
      }
    }
    
    await pool.end();
    this.results.database = dbResults;
    return dbResults;
  }

  // Benchmark cache operations
  async benchmarkCache() {
    console.log('\n🔄 Starting cache performance benchmarks...');
    
    const redis = require('redis');
    const client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });
    
    await client.connect();
    
    const cacheTests = [
      {
        name: 'String Set/Get',
        setup: async () => {
          await client.set('benchmark:string', 'test-value');
        },
        test: async () => {
          return await client.get('benchmark:string');
        }
      },
      {
        name: 'Hash Set/Get',
        setup: async () => {
          await client.hSet('benchmark:hash', 'field1', 'value1');
        },
        test: async () => {
          return await client.hGet('benchmark:hash', 'field1');
        }
      },
      {
        name: 'List Push/Pop',
        setup: async () => {
          await client.del('benchmark:list');
        },
        test: async () => {
          await client.lPush('benchmark:list', 'item');
          return await client.lPop('benchmark:list');
        }
      },
      {
        name: 'JSON Set/Get',
        setup: async () => {
          const data = { id: 1, name: 'Test Product', price: 99.99 };
          await client.set('benchmark:json', JSON.stringify(data));
        },
        test: async () => {
          const data = await client.get('benchmark:json');
          return JSON.parse(data);
        }
      }
    ];
    
    const cacheResults = {};
    
    for (const cacheTest of cacheTests) {
      console.log(`📊 Benchmarking: ${cacheTest.name}`);
      
      const iterations = 1000;
      const times = [];
      
      try {
        await cacheTest.setup();
        
        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          await cacheTest.test();
          const end = performance.now();
          times.push(end - start);
        }
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
        
        cacheResults[cacheTest.name] = {
          iterations,
          averageTime: avgTime,
          minTime,
          maxTime,
          p95Time
        };
        
        console.log(`✅ ${cacheTest.name}: ${avgTime.toFixed(2)}ms avg, ${p95Time.toFixed(2)}ms p95`);
      } catch (error) {
        console.error(`❌ Failed to benchmark ${cacheTest.name}:`, error.message);
        cacheResults[cacheTest.name] = { error: error.message };
      }
    }
    
    await client.quit();
    this.results.cache = cacheResults;
    return cacheResults;
  }

  // Benchmark file operations
  async benchmarkFileOperations() {
    console.log('\n📁 Starting file operation benchmarks...');
    
    const fileTests = [
      {
        name: 'Small File Read (1KB)',
        setup: () => {
          const content = 'x'.repeat(1024);
          fs.writeFileSync('benchmark-small.txt', content);
        },
        test: () => {
          return fs.readFileSync('benchmark-small.txt', 'utf8');
        },
        cleanup: () => {
          fs.unlinkSync('benchmark-small.txt');
        }
      },
      {
        name: 'Medium File Read (100KB)',
        setup: () => {
          const content = 'x'.repeat(100 * 1024);
          fs.writeFileSync('benchmark-medium.txt', content);
        },
        test: () => {
          return fs.readFileSync('benchmark-medium.txt', 'utf8');
        },
        cleanup: () => {
          fs.unlinkSync('benchmark-medium.txt');
        }
      },
      {
        name: 'JSON Parse/Stringify',
        setup: () => {
          this.testData = {
            products: Array.from({ length: 100 }, (_, i) => ({
              id: i,
              name: `Product ${i}`,
              price: Math.random() * 100,
              category: `Category ${i % 10}`
            }))
          };
        },
        test: () => {
          const json = JSON.stringify(this.testData);
          return JSON.parse(json);
        }
      }
    ];
    
    const fileResults = {};
    
    for (const fileTest of fileTests) {
      console.log(`📊 Benchmarking: ${fileTest.name}`);
      
      const iterations = 100;
      const times = [];
      
      try {
        if (fileTest.setup) await fileTest.setup();
        
        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          await fileTest.test();
          const end = performance.now();
          times.push(end - start);
        }
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
        
        fileResults[fileTest.name] = {
          iterations,
          averageTime: avgTime,
          minTime,
          maxTime,
          p95Time
        };
        
        console.log(`✅ ${fileTest.name}: ${avgTime.toFixed(2)}ms avg, ${p95Time.toFixed(2)}ms p95`);
        
        if (fileTest.cleanup) await fileTest.cleanup();
      } catch (error) {
        console.error(`❌ Failed to benchmark ${fileTest.name}:`, error.message);
        fileResults[fileTest.name] = { error: error.message };
      }
    }
    
    this.results.fileOperations = fileResults;
    return fileResults;
  }

  // Run all benchmarks
  async runAllBenchmarks() {
    console.log('🏁 Starting comprehensive performance benchmarks...\n');
    
    const startTime = performance.now();
    
    try {
      await this.benchmarkAPI();
      await this.benchmarkDatabase();
      await this.benchmarkCache();
      await this.benchmarkFileOperations();
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      this.results.metadata = {
        timestamp: new Date().toISOString(),
        totalDuration: totalTime,
        environment: process.env.NODE_ENV || 'development'
      };
      
      this.generateReport();
      
      console.log(`\n🎉 All benchmarks completed in ${(totalTime / 1000).toFixed(2)} seconds`);
    } catch (error) {
      console.error('❌ Benchmark suite failed:', error);
    }
  }

  // Generate comprehensive report
  generateReport() {
    const reportPath = `performance-benchmark-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    // Generate human-readable report
    this.generateHumanReadableReport();
    
    console.log(`📊 Benchmark report saved to ${reportPath}`);
  }

  // Generate human-readable report
  generateHumanReadableReport() {
    let output = `
# Performance Benchmark Report
Generated: ${new Date().toLocaleString()}
Environment: ${this.results.metadata?.environment || 'unknown'}
Total Duration: ${((this.results.metadata?.totalDuration || 0) / 1000).toFixed(2)} seconds

## API Performance
`;
    
    if (this.results.api) {
      for (const [name, result] of Object.entries(this.results.api)) {
        if (result.error) {
          output += `\n### ❌ ${name}: ERROR - ${result.error}\n`;
        } else {
          output += `
### ✅ ${name}
- **Requests/sec**: ${result.requests?.average || 'N/A'}
- **Average Latency**: ${result.latency?.average || 'N/A'}ms
- **95th Percentile**: ${result.latency?.p95 || 'N/A'}ms
- **Errors**: ${result.errors || 0}
- **Timeouts**: ${result.timeouts || 0}
`;
        }
      }
    }
    
    output += `\n## Database Performance\n`;
    
    if (this.results.database) {
      for (const [name, result] of Object.entries(this.results.database)) {
        if (result.error) {
          output += `\n### ❌ ${name}: ERROR - ${result.error}\n`;
        } else {
          output += `
### ✅ ${name}
- **Average Time**: ${result.averageTime?.toFixed(2) || 'N/A'}ms
- **Min Time**: ${result.minTime?.toFixed(2) || 'N/A'}ms
- **Max Time**: ${result.maxTime?.toFixed(2) || 'N/A'}ms
- **95th Percentile**: ${result.p95Time?.toFixed(2) || 'N/A'}ms
- **Iterations**: ${result.iterations || 'N/A'}
`;
        }
      }
    }
    
    output += `\n## Cache Performance\n`;
    
    if (this.results.cache) {
      for (const [name, result] of Object.entries(this.results.cache)) {
        if (result.error) {
          output += `\n### ❌ ${name}: ERROR - ${result.error}\n`;
        } else {
          output += `
### ✅ ${name}
- **Average Time**: ${result.averageTime?.toFixed(2) || 'N/A'}ms
- **Min Time**: ${result.minTime?.toFixed(2) || 'N/A'}ms
- **Max Time**: ${result.maxTime?.toFixed(2) || 'N/A'}ms
- **95th Percentile**: ${result.p95Time?.toFixed(2) || 'N/A'}ms
`;
        }
      }
    }
    
    output += `
## Recommendations

### API Optimization
- Target: <100ms average latency for most endpoints
- Target: >1000 requests/sec for simple endpoints
- Monitor and optimize slow endpoints

### Database Optimization
- Target: <10ms for simple queries
- Target: <50ms for complex queries
- Consider indexing for queries >100ms

### Cache Optimization
- Target: <1ms for cache operations
- Monitor cache hit rates
- Optimize cache key strategies

### Next Steps
1. Set up continuous performance monitoring
2. Implement performance budgets in CI/CD
3. Optimize identified bottlenecks
4. Schedule regular performance reviews
`;
    
    const reportPath = `performance-benchmark-${Date.now()}.md`;
    fs.writeFileSync(reportPath, output);
    console.log(`📄 Human-readable report saved to ${reportPath}`);
  }
}

// CLI usage
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'api':
      benchmark.benchmarkAPI().catch(console.error);
      break;
    case 'database':
      benchmark.benchmarkDatabase().catch(console.error);
      break;
    case 'cache':
      benchmark.benchmarkCache().catch(console.error);
      break;
    case 'files':
      benchmark.benchmarkFileOperations().catch(console.error);
      break;
    case 'all':
    default:
      benchmark.runAllBenchmarks().catch(console.error);
      break;
  }
}

module.exports = PerformanceBenchmark;