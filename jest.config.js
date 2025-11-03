module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Test match patterns
    testMatch: [
        '**/tests/**/*.test.js',
        '**/__tests__/**/*.js'
    ],

    // Coverage configuration
    collectCoverageFrom: [
        'src/**/*.js',
        'database/db-v3.js',
        '!src/main.js',
        '!src/app.js',
        '!src/ws/**',
        '!**/*.test.js'
    ],

    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],

    // Coverage thresholds - per-file only for now
    coverageThreshold: {
        // Per-file thresholds for critical files
        'src/utils/userFetching.js': {
            branches: 85,
            functions: 100,
            lines: 90,
            statements: 90
        }
    },

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

    // Timeout
    testTimeout: 30000,

    // Clear mocks between tests
    clearMocks: true,

    // Verbose output
    verbose: true
};
