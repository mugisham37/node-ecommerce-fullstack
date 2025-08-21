/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.integration.(test|spec).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run integration tests sequentially
  collectCoverageFrom: [
    '../../apps/**/*.{ts,tsx}',
    '../../packages/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageDirectory: '../../coverage/integration',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^@packages/(.*)$': '<rootDir>/../../packages/$1/src',
    '^@apps/(.*)$': '<rootDir>/../../apps/$1/src'
  }
};