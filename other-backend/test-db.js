const { PrismaClient } = require('@prisma/client');
const path = require('path');

console.log('=== Database Connection Test ===');
console.log('Current working directory:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

// Load environment variables
require('dotenv').config();
console.log('After dotenv - DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

try {
  console.log('Creating Prisma client...');
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  console.log('Testing connection...');
  prisma.$connect()
    .then(() => {
      console.log('✅ Prisma connection successful');
      return prisma.$disconnect();
    })
    .then(() => {
      console.log('✅ Prisma disconnected successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Prisma connection failed:', error.message);
      console.error('Full error:', error);
      process.exit(1);
    });
} catch (error) {
  console.error('❌ Error creating Prisma client:', error.message);
  console.error('Full error:', error);
  process.exit(1);
}
