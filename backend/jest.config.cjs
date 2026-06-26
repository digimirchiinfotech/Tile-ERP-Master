/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {},
  testMatch: [
    '**/src/__tests__/**/*.test.js',
    '**/tests/integration/**/*.test.js',
    '**/tests/unit/**/*.test.js'
  ],
  setupFiles: ['<rootDir>/src/__tests__/setup.js'],
  testTimeout: 60000,
  forceExit: true,
  verbose: true,
  collectCoverageFrom: [
    'src/controllers/**/*.js',
    'src/services/**/*.js',
    'src/utils/**/*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
};
