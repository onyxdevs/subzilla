import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import { IConvertCommandOptions, IConfig, ICommandDefinition } from '@subzilla/types';

import { ConvertCommandCreator } from '../../src/commands/convert-command';

// Mock the core modules
jest.mock('@subzilla/core', () => ({
    SubtitleProcessor: jest.fn(),
    ConfigManager: {
        loadConfig: jest.fn(),
    },
}));

describe('ConvertCommandCreator', () => {
    let commandCreator: ConvertCommandCreator;
    let tempDir: string;
    let mockConsoleLog: jest.MockedFunction<typeof console.log>;
    let mockConsoleError: jest.MockedFunction<typeof console.error>;
    let mockProcessExit: jest.MockedFunction<typeof process.exit>;

    beforeEach(async () => {
        commandCreator = new ConvertCommandCreator();
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subzilla-cli-test-'));

        // Mock console methods
        mockConsoleLog = console.log as jest.MockedFunction<typeof console.log>;
        mockConsoleError = console.error as jest.MockedFunction<typeof console.error>;
        mockProcessExit = process.exit as jest.MockedFunction<typeof process.exit>;

        // Clear all mocks
        jest.clearAllMocks();

        // Setup mocks
        const { SubtitleProcessor, ConfigManager } = require('@subzilla/core');
        const mockProcessFile = jest.fn<() => Promise<{ outputPath: string; backupPath: string }>>().mockResolvedValue({
            outputPath: '/mock/output.srt',
            backupPath: '/mock/backup.srt',
        });

        (SubtitleProcessor as jest.Mock).mockImplementation(() => ({
            processFile: mockProcessFile,
        }));

        ConfigManager.loadConfig.mockResolvedValue({
            output: {
                createBackup: false,
                overwriteBackup: true,
                bom: true,
                lineEndings: 'auto',
                overwriteInput: false,
                overwriteExisting: false,
            },
            batch: {
                retryCount: 0,
                retryDelay: 1000,
            },
        });
    });

    afterEach(async () => {
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('getDefinition', () => {
        it('should return correct command definition', () => {
            const definition = (
                commandCreator as unknown as { getDefinition(): ICommandDefinition<IConvertCommandOptions> }
            ).getDefinition();

            expect(definition.name).toBe('convert');
            expect(definition.description).toBe('Convert a single subtitle file to UTF-8');
            expect(definition.arguments).toBeDefined();
            expect(definition.arguments).toHaveLength(1);
            expect(definition.arguments![0].name).toBe('inputFile');
            expect(definition.options).toBeDefined();
            expect(typeof definition.action).toBe('function');
        });
    });

    describe('action', () => {
        let testFilePath: string;
        let definition: ICommandDefinition<IConvertCommandOptions>;

        beforeEach(async () => {
            testFilePath = path.join(tempDir, 'test.srt');
            await fs.promises.writeFile(testFilePath, 'test content', 'utf8');
            definition = (
                commandCreator as unknown as { getDefinition(): ICommandDefinition<IConvertCommandOptions> }
            ).getDefinition();
        });

        it('should successfully process a file with default options', async () => {
            const options: IConvertCommandOptions = {};

            await definition.action(testFilePath, options);

            expect(mockConsoleLog).toHaveBeenCalledWith('🧬 Output options:', expect.any(Object));
            expect(mockConsoleLog).toHaveBeenCalledWith('✨ Conversion successful!');
            expect(mockConsoleLog).toHaveBeenCalledWith(`Input file: ${testFilePath}`);
        });

        it('should use custom output path when provided', async () => {
            const outputPath = path.join(tempDir, 'custom-output.srt');
            const options: IConvertCommandOptions = {
                output: outputPath,
            };

            await definition.action(testFilePath, options);

            expect(mockConsoleLog).toHaveBeenCalledWith(`Output file: ${outputPath}`);
        });

        it('should use default output path when not provided', async () => {
            const options: IConvertCommandOptions = {};

            await definition.action(testFilePath, options);

            const expectedOutput = `${path.join(path.dirname(testFilePath), 'test')}.subzilla.srt`;

            expect(mockConsoleLog).toHaveBeenCalledWith(`Output file: ${expectedOutput}`);
        });

        it('should show backup message when backup is enabled', async () => {
            const options: IConvertCommandOptions = {
                backup: true,
            };

            await definition.action(testFilePath, options);

            expect(mockConsoleLog).toHaveBeenCalledWith(`Backup file: ${testFilePath}.bak`);
        });

        it('should handle strip options correctly', async () => {
            const options: IConvertCommandOptions = {
                stripHtml: true,
                stripColors: true,
                stripAll: false,
            };

            await definition.action(testFilePath, options);

            expect(mockConsoleLog).toHaveBeenCalledWith(
                '🧬 Output options:',
                expect.objectContaining({
                    strip: expect.objectContaining({
                        html: true,
                        colors: true,
                    }),
                }),
            );
        });

        it('should handle numeric options correctly', async () => {
            const options: IConvertCommandOptions = {
                retryCount: '3',
                retryDelay: '2000',
            };

            await definition.action(testFilePath, options);

            expect(mockConsoleLog).toHaveBeenCalledWith(
                '🧬 Output options:',
                expect.objectContaining({
                    retryCount: 3,
                    retryDelay: 2000,
                }),
            );
        });

        it('should handle boolean options correctly', async () => {
            const options: IConvertCommandOptions = {
                bom: true,
                overwriteInput: true,
                overwriteExisting: true,
                overwriteBackup: false,
            };

            await definition.action(testFilePath, options);

            expect(mockConsoleLog).toHaveBeenCalledWith(
                '🧬 Output options:',
                expect.objectContaining({
                    bom: true,
                    overwriteInput: true,
                    overwriteExisting: true,
                    overwriteBackup: false,
                }),
            );
        });

        it('should use loaded config when provided', async () => {
            const customConfig = {
                output: {
                    createBackup: true,
                    bom: false,
                },
            } as IConfig;

            const options: IConvertCommandOptions = {
                loadedConfig: customConfig,
            };

            await definition.action(testFilePath, options);

            expect(mockConsoleLog).toHaveBeenCalledWith(
                '🧬 Output options:',
                expect.objectContaining({
                    backupOriginal: true,
                    bom: false,
                }),
            );
        });

        it('should handle errors gracefully', async () => {
            const { SubtitleProcessor } = require('@subzilla/core');
            const mockProcessor = new SubtitleProcessor();

            mockProcessor.processFile.mockRejectedValueOnce(new Error('Processing failed'));

            const options: IConvertCommandOptions = {};

            await definition.action(testFilePath, options);

            expect(mockConsoleError).toHaveBeenCalledWith('❌ Error:', 'Processing failed');
            expect(mockProcessExit).toHaveBeenCalledWith(1);
        });

        it('should handle line endings option', async () => {
            const options: IConvertCommandOptions = {
                lineEndings: 'lf',
            };

            await definition.action(testFilePath, options);

            expect(mockConsoleLog).toHaveBeenCalledWith(
                '🧬 Output options:',
                expect.objectContaining({
                    lineEndings: 'lf',
                }),
            );
        });
    });

    describe('getDefaultOutputPath', () => {
        it('should generate correct default output path', () => {
            const inputFile = '/path/to/input.srt';
            const result = (
                commandCreator as unknown as { getDefaultOutputPath(file: string): string }
            ).getDefaultOutputPath(inputFile);

            expect(result).toBe('/path/to/input.subzilla.srt');
        });

        it('should handle files with multiple dots', () => {
            const inputFile = '/path/to/file.name.with.dots.srt';
            const result = (
                commandCreator as unknown as { getDefaultOutputPath(file: string): string }
            ).getDefaultOutputPath(inputFile);

            expect(result).toBe('/path/to/file.name.with.dots.subzilla.srt');
        });

        it('should handle files without extension', () => {
            const inputFile = '/path/to/filename';
            const result = (
                commandCreator as unknown as { getDefaultOutputPath(file: string): string }
            ).getDefaultOutputPath(inputFile);

            expect(result).toBe('.subzilla./path/to/filename');
        });
    });
});
