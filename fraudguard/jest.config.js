const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  // Run tests in Node environment (adapter tests use Node crypto APIs)
  testEnvironment: 'node',
  
  // Module path aliases matching Next.js
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  
  // Transform ES module imports from @upstash/redis etc.
  transformIgnorePatterns: [
    'node_modules/(?!(next-auth|@auth|@upstash|jose|openid-client|oauth4webapi)/)',
  ],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.test.ts',
    '**/*.test.js',
    '**/*.test.ts',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'lib/**/*.js',
    'app/api/**/*.js',
    '!lib/gbm_model.json',
    '!lib/model_weights.json',
    '!node_modules/**',
  ],
};

// createJestConfig handles Next.js ESM transform automatically
module.exports = createJestConfig(customJestConfig);
