/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/__tests__/**/*.test.js'],
  setupFiles: ['<rootDir>/src/__tests__/setup.js'],
  testTimeout: 60000,
  forceExit: true,
  verbose: true,
};
