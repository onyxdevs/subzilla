/** @type {import('jest').Config} */
module.exports = {
    // Use TypeScript preset for all packages
    preset: 'ts-jest',

    // Test environment
    testEnvironment: 'node',

    // Project-wide settings
    projects: [
        {
            displayName: 'types',
            testMatch: ['<rootDir>/packages/types/**/*.test.ts'],
            preset: 'ts-jest',
            testEnvironment: 'node',
            moduleNameMapper: {
                '^@subzilla/types$': '<rootDir>/packages/types/src',
            },
        },
        {
            displayName: 'core',
            testMatch: ['<rootDir>/packages/core/**/*.test.ts'],
            preset: 'ts-jest',
            testEnvironment: 'node',
            moduleNameMapper: {
                '^@subzilla/types$': '<rootDir>/packages/types/src',
                '^@subzilla/core$': '<rootDir>/packages/core/src',
            },
            // Setup files for core tests
            setupFilesAfterEnv: ['<rootDir>/packages/core/jest.setup.ts'],
        },
        {
            displayName: 'cli',
            testMatch: ['<rootDir>/packages/cli/**/*.test.ts'],
            preset: 'ts-jest',
            testEnvironment: 'node',
            moduleNameMapper: {
                '^@subzilla/types$': '<rootDir>/packages/types/src',
                '^@subzilla/core$': '<rootDir>/packages/core/src',
                '^@subzilla/cli$': '<rootDir>/packages/cli/src',
            },
            // Setup files for CLI tests
            setupFilesAfterEnv: ['<rootDir>/packages/cli/jest.setup.ts'],
        },
    ],

    // Global settings
    collectCoverageFrom: ['packages/*/src/**/*.ts', '!packages/*/src/**/*.d.ts', '!packages/*/src/**/index.ts'],

    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],

    // Coverage thresholds (lowered for initial setup)
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 60,
            lines: 60,
            statements: 60,
        },
    },

    // Test timeout for integration tests
    testTimeout: 30000,

    // Clear mocks between tests
    clearMocks: true,

    // Verbose output
    verbose: true,
};
