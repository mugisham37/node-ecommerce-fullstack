import { beforeAll } from '@jest/globals';

beforeAll(async () => {
  console.log('Setting up health check tests...');
  
  // Verify environment variables
  const requiredEnvVars = ['BASE_URL', 'API_URL'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
  
  console.log(`Base URL: ${process.env.BASE_URL}`);
  console.log(`API URL: ${process.env.API_URL}`);
});