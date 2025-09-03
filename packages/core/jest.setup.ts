import { jest } from '@jest/globals';

// Global test setup for core package
beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
});

// Mock console methods to avoid noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
};

// Mock process.exit to prevent tests from actually exiting
const mockExit = jest.fn();

process.exit = mockExit as any;

// Reset mocks after each test
afterEach(() => {
    mockExit.mockClear();
});
