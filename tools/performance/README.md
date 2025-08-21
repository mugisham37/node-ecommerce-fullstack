# Performance Tools

This directory contains comprehensive performance monitoring and optimization tools for the monorepo.

## Tools Overview

### 1. Performance Monitoring (`monitoring.js`)
Real-time performance monitoring with Prometheus metrics integration.

**Features:**
- HTTP request monitoring (duration, count, status codes)
- Database query performance tracking
- Cache hit rate monitoring
- System resource monitoring (CPU, memory)
- Custom metrics collection
- Health check endpoints

**Usage:**
```bash
# Start monitoring server
node monitoring.js

# Access metrics
curl http://localhost:9090/metrics

# Health check
curl http://localhost:9090/health
```

### 2. Bundle Analyzer (`bundle-analyzer.js`)
Analyzes webpack bundles for optimization opportunities.

**Features:**
- Bundle size analysis
- Asset size breakdown
- Module duplication detection
- Chunk optimization recommendations
- Automated optimization reports

**Usage:**
```bash
# Analyze all apps
node bundle-analyzer.js analyze

# Analyze specific app
node bundle-analyzer.js analyze web
node bundle-analyzer.js analyze admin
```

### 3. Performance Benchmark (`benchmark.js`)
Comprehensive performance benchmarking suite.

**Features:**
- API endpoint benchmarking
- Database query performance testing
- Cache operation benchmarking
- File operation performance testing
- Automated performance reports

**Usage:**
```bash
# Run all benchmarks
node benchmark.js all

# Run specific benchmarks
node benchmark.js api
node benchmark.js database
node benchmark.js cache
node benchmark.js files
```

## Scripts Overview

### Database Optimization (`../scripts/optimization/optimize-db.ps1`)
Comprehensive database performance optimization script.

**Features:**
- Table analysis and statistics updates
- Index optimization and creation
- Database vacuum and cleanup
- Configuration recommendations
- Slow query identification
- Connection optimization advice

**Usage:**
```powershell
# Production optimization
.\scripts\optimization\optimize-db.ps1 -Environment production

# Development optimization
.\scripts\optimization\optimize-db.ps1 -Environment development

# Custom database
.\scripts\optimization\optimize-db.ps1 -DatabaseHost "db.example.com" -DatabaseName "custom_db"
```

### Cache Warming (`../scripts/optimization/cache-warming.ps1`)
Pre-loads frequently accessed data into Redis cache.

**Features:**
- Product catalog cache warming
- User session cache warming
- Inventory data cache warming
- Analytics cache warming
- Cache performance monitoring
- Expiration policy configuration

**Usage:**
```powershell
# Warm essential caches
.\scripts\optimization\cache-warming.ps1

# Warm all caches
.\scripts\optimization\cache-warming.ps1 -WarmAll

# Custom Redis server
.\scripts\optimization\cache-warming.ps1 -RedisHost "redis.example.com" -RedisPort 6380
```

## CDN Optimization

### Configuration (`../infrastructure/cdn/optimization.conf`)
Nginx configuration optimized for maximum performance.

**Features:**
- Gzip and Brotli compression
- Optimal cache headers
- Image format optimization (WebP, AVIF)
- HTTP/2 server push
- Security headers
- Rate limiting
- Performance monitoring endpoints

## Installation

Install required dependencies:

```bash
cd tools/performance
npm install
```

## Environment Variables

Create a `.env` file in the tools/performance directory:

```env
# API Configuration
API_BASE_URL=http://localhost:3001

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventory_db
DB_USER=postgres
DB_PASSWORD=your_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Environment
NODE_ENV=production
```

## Integration with CI/CD

### Performance Budgets
Add performance budgets to your CI/CD pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Tests
on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd tools/performance
          npm install
      
      - name: Run performance benchmarks
        run: |
          cd tools/performance
          node benchmark.js all
      
      - name: Analyze bundles
        run: |
          cd tools/performance
          node bundle-analyzer.js analyze
      
      - name: Upload performance reports
        uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: |
            performance-benchmark-*.json
            performance-benchmark-*.md
            bundle-optimization-report-*.json
            bundle-optimization-report-*.md
```

### Performance Monitoring Dashboard

Set up Grafana dashboards using the Prometheus metrics:

1. Import the monitoring server metrics endpoint
2. Create dashboards for:
   - HTTP request performance
   - Database query performance
   - Cache hit rates
   - System resource usage
   - Bundle size trends

## Best Practices

### Performance Optimization Workflow

1. **Baseline Measurement**
   ```bash
   node benchmark.js all
   ```

2. **Bundle Analysis**
   ```bash
   node bundle-analyzer.js analyze
   ```

3. **Database Optimization**
   ```powershell
   .\scripts\optimization\optimize-db.ps1
   ```

4. **Cache Warming**
   ```powershell
   .\scripts\optimization\cache-warming.ps1 -WarmAll
   ```

5. **Continuous Monitoring**
   ```bash
   node monitoring.js
   ```

### Performance Targets

- **API Response Time**: <100ms for 95% of requests
- **Database Queries**: <10ms for simple queries, <50ms for complex
- **Cache Operations**: <1ms average
- **Bundle Size**: <1MB per app
- **Cache Hit Rate**: >90%
- **Page Load Time**: <2s for initial load, <500ms for subsequent

### Monitoring Alerts

Set up alerts for:
- API response time >200ms
- Database query time >100ms
- Cache hit rate <80%
- Bundle size increase >20%
- Memory usage >80%
- CPU usage >70%

## Troubleshooting

### Common Issues

1. **High API Latency**
   - Check database query performance
   - Verify cache hit rates
   - Review network connectivity
   - Analyze slow query logs

2. **Large Bundle Sizes**
   - Run bundle analyzer
   - Implement code splitting
   - Remove unused dependencies
   - Optimize images and assets

3. **Low Cache Hit Rates**
   - Review cache key strategies
   - Adjust TTL values
   - Warm cache more frequently
   - Monitor cache eviction patterns

4. **Database Performance Issues**
   - Run database optimization script
   - Check index usage
   - Analyze query execution plans
   - Monitor connection pool usage

## Contributing

When adding new performance tools:

1. Follow the existing code structure
2. Add comprehensive error handling
3. Include detailed logging
4. Generate both JSON and human-readable reports
5. Add CLI usage examples
6. Update this README with new features