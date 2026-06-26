/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {},
  testMatch: [
    '**/tests/integration/**/*.test.js',
    '**/tests/unit/**/*.test.js'
  ],
  setupFiles: ['<rootDir>/src/__tests__/setup.js'],
  testTimeout: 60000,
  forceExit: true,
  verbose: true,
  collectCoverageFrom: [
    'src/controllers/lockController.js',
    'src/controllers/authController.js'
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  }
};
