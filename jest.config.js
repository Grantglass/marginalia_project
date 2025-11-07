module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'server.js',
    'services/**/*.js',
    'utils/**/*.js',
    'config/**/*.js',
    '!node_modules/**',
    '!coverage/**',
  ],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  verbose: true,
};
