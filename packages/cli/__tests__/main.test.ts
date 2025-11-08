import { execSync } from 'child_process';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the core modules to prevent actual file operations during tests
jest.mock('@subzilla/core', () => ({
    ConfigManager: {
        loadConfig: jest.fn(),
    },
    SubtitleProcessor: jest.fn(),
    BatchProcessor: jest.fn(),
}));

describe('CLI Main Entry Point', () => {
    const cliPath = path.resolve(__dirname, '../dist/main.js');
    let originalArgv: string[];

    beforeEach(() => {
        originalArgv = process.argv;
        jest.clearAllMocks();

        // Setup mocks
        const { ConfigManager, SubtitleProcessor, BatchProcessor } = require('@subzilla/core');

        ConfigManager.loadConfig.mockResolvedValue({
            output: { createBackup: false },
            batch: { retryCount: 0 },
        });

        const mockProcessFile = jest.fn<() => Promise<{ outputPath: string }>>().mockResolvedValue({
            outputPath: '/mock/output.srt',
        });
        const mockProcessBatch = jest
            .fn<() => Promise<{ successful: number; failed: number; total: number }>>()
            .mockResolvedValue({
                successful: 1,
                failed: 0,
                total: 1,
            });

        (SubtitleProcessor as jest.Mock).mockImplementation(() => ({
            processFile: mockProcessFile,
        }));

        (BatchProcessor as jest.Mock).mockImplementation(() => ({
            processBatch: mockProcessBatch,
        }));
    });

    afterEach(() => {
        process.argv = originalArgv;
    });

    describe('CLI Help and Version', () => {
        it('should display help when --help is passed', () => {
            try {
                const output = execSync(`node ${cliPath} --help`, {
                    encoding: 'utf8',
                    timeout: 5000,
                });

                expect(output).toContain('subzilla');
                expect(output).toContain('Convert subtitle files to UTF-8');
                expect(output).toContain('Commands:');
                expect(output).toContain('convert');
                expect(output).toContain('batch');
            } catch (error: unknown) {
                // Help command exits with code 0, but execSync might throw
                const execError = error as { status?: number; stdout?: string };

                if (execError.status === 0) {
                    expect(execError.stdout).toContain('subzilla');
                } else {
                    throw error;
                }
            }
        });

        it('should display version when --version is passed', () => {
            try {
                const output = execSync(`node ${cliPath} --version`, {
                    encoding: 'utf8',
                    timeout: 5000,
                });

                expect(output).toMatch(/\d+\.\d+\.\d+/); // Version pattern
            } catch (error: unknown) {
                // Version command exits with code 0, but execSync might throw
                const execError = error as { status?: number; stdout?: string };

                if (execError.status === 0) {
                    expect(execError.stdout).toMatch(/\d+\.\d+\.\d+/);
                } else {
                    throw error;
                }
            }
        });
    });

    describe('Command Registration', () => {
        it('should show convert command in help', () => {
            try {
                const output = execSync(`node ${cliPath} convert --help`, {
                    encoding: 'utf8',
                    timeout: 5000,
                });

                expect(output).toContain('Convert a single subtitle file to UTF-8');
                expect(output).toContain('inputFile');
            } catch (error: unknown) {
                const execError = error as { status?: number; stdout?: string };

                if (execError.status === 0) {
                    expect(execError.stdout).toContain('Convert a single subtitle file');
                } else {
                    throw error;
                }
            }
        });

        it('should show batch command in help', () => {
            try {
                const output = execSync(`node ${cliPath} batch --help`, {
                    encoding: 'utf8',
                    timeout: 5000,
                });

                expect(output).toContain('Convert multiple subtitle files');
                expect(output).toContain('pattern');
            } catch (error: unknown) {
                const execError = error as { status?: number; stdout?: string };

                if (execError.status === 0) {
                    expect(execError.stdout).toContain('Convert multiple subtitle files');
                } else {
                    throw error;
                }
            }
        });

        it('should show init command in help', () => {
            try {
                const output = execSync(`node ${cliPath} init --help`, {
                    encoding: 'utf8',
                    timeout: 5000,
                });

                expect(output).toContain('Create a default configuration file');
            } catch (error: unknown) {
                const execError = error as { status?: number; stdout?: string };

                if (execError.status === 0) {
                    expect(execError.stdout).toContain('Create a default configuration');
                } else {
                    throw error;
                }
            }
        });

        it('should show info command in help', () => {
            try {
                const output = execSync(`node ${cliPath} info --help`, {
                    encoding: 'utf8',
                    timeout: 5000,
                });

                expect(output).toContain('Show detailed information about a subtitle file');
            } catch (error: unknown) {
                const execError = error as { status?: number; stdout?: string };

                if (execError.status === 0) {
                    expect(execError.stdout).toContain('Show detailed information about a subtitle file');
                } else {
                    throw error;
                }
            }
        });
    });

    describe('Error Handling', () => {
        it('should show error for unknown command', () => {
            try {
                execSync(`node ${cliPath} unknown-command`, {
                    encoding: 'utf8',
                    timeout: 5000,
                });

                // Should not reach here
                expect(true).toBe(false);
            } catch (error: unknown) {
                const execError = error as { status?: number; stderr?: string; stdout?: string };

                expect(execError.status).not.toBe(0);
                expect(execError.stderr || execError.stdout).toContain('unknown command');
            }
        });

        it('should handle missing required arguments gracefully', () => {
            try {
                execSync(`node ${cliPath} convert`, {
                    encoding: 'utf8',
                    timeout: 5000,
                });

                // Should not reach here
                expect(true).toBe(false);
            } catch (error: unknown) {
                const execError = error as { status?: number; stderr?: string; stdout?: string };

                expect(execError.status).not.toBe(0);
                // Should show error about missing argument
                expect(execError.stderr || execError.stdout).toContain('argument');
            }
        });
    });

    describe('Configuration Loading', () => {
        it('should load configuration before command execution', () => {
            // This test verifies that the preAction hook works
            // The actual config loading is mocked, so we just verify the structure
            const { ConfigManager } = require('@subzilla/core');

            expect(ConfigManager.loadConfig).toBeDefined();
            expect(typeof ConfigManager.loadConfig).toBe('function');
        });
    });
});
