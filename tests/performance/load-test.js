import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
    errors: ['rate<0.1'],             // Custom error rate must be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://inventory-app.com';
const API_URL = __ENV.API_URL || 'https://api.inventory-app.com';

export default function () {
  // Test homepage
  let response = http.get(`${BASE_URL}`);
  check(response, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage loads in <2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  sleep(1);

  // Test API health endpoint
  response = http.get(`${API_URL}/health`);
  check(response, {
    'API health status is 200': (r) => r.status === 200,
    'API health response time <500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test API products endpoint (if available)
  response = http.get(`${API_URL}/api/products`, {
    headers: {
      'Accept': 'application/json',
    },
  });
  check(response, {
    'Products API accessible': (r) => r.status === 200 || r.status === 401, // 401 is OK (auth required)
    'Products API response time <1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(2);
}