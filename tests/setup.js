/**
 * Test Setup
 * Global configuration for all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CLIENT_ID = 'test_client_123';
process.env.API_BASE_URL = 'http://localhost:3000';

// Mock console methods to reduce noise in test output
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Global test timeout
jest.setTimeout(30000);
