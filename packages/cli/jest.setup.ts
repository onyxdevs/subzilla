import { jest } from '@jest/globals';

// Global test setup for CLI package
beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
});

// Mock console methods for CLI tests
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
};

// Mock process.exit and process.argv
const mockExit = jest.fn();
const originalArgv = process.argv;

process.exit = mockExit as any;

// Reset process.argv and mocks after each test
afterEach(() => {
    process.argv = originalArgv;
    mockExit.mockClear();
});
