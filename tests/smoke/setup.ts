import { beforeAll } from '@jest/globals';

beforeAll(async () => {
  console.log('Setting up smoke tests...');
  
  // Verify environment variables
  const requiredEnvVars = ['API_URL', 'WEB_URL'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
  
  console.log(`API URL: ${process.env.API_URL}`);
  console.log(`Web URL: ${process.env.WEB_URL}`);
});