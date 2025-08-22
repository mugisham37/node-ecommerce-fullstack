const fs = require('fs');
const path = require('path');

// Simple build script to create the dist directory structure
const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

// Create dist directory
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Create a simple index.js file
const indexContent = `
// Simple configuration export for now
const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 4000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ecommerce_inventory_dev',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret-key',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  ADMIN_URL: process.env.ADMIN_URL || 'http://localhost:3001',
};

module.exports = { appConfig: config };
`;

fs.writeFileSync(path.join(distDir, 'index.js'), indexContent);

// Create index.d.ts
const typesContent = `
export interface BaseConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  CLIENT_URL: string;
  ADMIN_URL: string;
}

export declare const appConfig: BaseConfig;
`;

fs.writeFileSync(path.join(distDir, 'index.d.ts'), typesContent);

console.log('✅ Simple build completed');