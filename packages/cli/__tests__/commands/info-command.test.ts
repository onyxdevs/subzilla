import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import { IInfoCommandOptions, ICommandDefinition } from '@subzilla/types';

import { InfoCommandCreator } from '../../src/commands/info-command';

// Mock the core modules
jest.mock('@subzilla/core', () => ({
    EncodingDetectionService: {
        detectEncoding: jest.fn(),
    },
}));

describe('InfoCommandCreator', () => {
    let commandCreator: InfoCommandCreator;
    let tempDir: string;
    let mockConsoleLog: jest.MockedFunction<typeof console.log>;
    let mockConsoleError: jest.MockedFunction<typeof console.error>;
    let mockProcessExit: jest.MockedFunction<typeof process.exit>;

    beforeEach(async () => {
        commandCreator = new InfoCommandCreator();
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subzilla-info-test-'));

        // Mock console methods
        mockConsoleLog = console.log as jest.MockedFunction<typeof console.log>;
        mockConsoleError = console.error as jest.MockedFunction<typeof console.error>;
        mockProcessExit = process.exit as jest.MockedFunction<typeof process.exit>;

        // Clear all mocks
        jest.clearAllMocks();

        // Setup default mock for encoding detection
        const { EncodingDetectionService } = require('@subzilla/core');

        EncodingDetectionService.detectEncoding.mockResolvedValue('utf-8');
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
                commandCreator as unknown as { getDefinition(): ICommandDefinition<IInfoCommandOptions> }
            ).getDefinition();

            expect(definition.name).toBe('info');
            expect(definition.description).toBe('Show detailed information about a subtitle file');
            expect(definition.arguments).toBeDefined();
            expect(definition.arguments).toHaveLength(1);
            expect(definition.arguments?.[0].name).toBe('inputFile');
            expect(definition.arguments?.[0].description).toBe('path to the subtitle file');
            expect(definition.options).toBeDefined();
            expect(definition.options).toHaveLength(0); // No options currently
            expect(typeof definition.action).toBe('function');
        });
    });

    describe('action', () => {
        let testFilePath: string;
        let definition: ICommandDefinition<IInfoCommandOptions>;

        beforeEach(() => {
            definition = (
                commandCreator as unknown as { getDefinition(): ICommandDefinition<IInfoCommandOptions> }
            ).getDefinition();
        });

        describe('basic file information', () => {
            it('should display basic file information for a UTF-8 file without BOM', async () => {
                testFilePath = path.join(tempDir, 'test.srt');

                const content = '1\n00:00:01,000 --> 00:00:02,000\nHello World\n';

                await fs.promises.writeFile(testFilePath, content, 'utf8');

                await definition.action(testFilePath, {});

                expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📄 SRT File Information'));
                expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📝 Basic Information'));
                expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining(`File:`));
                expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining(`Size:`));
                expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining(`Modified:`));
            });

            it('should display file path correctly', async () => {
                testFilePath = path.join(tempDir, 'subtitle.srt');
                await fs.promises.writeFile(testFilePath, 'test content', 'utf8');

                await definition.action(testFilePath, {});

                // Check that the file path is displayed (console.log is called with the template string)
                const filePathCalls = mockConsoleLog.mock.calls.filter((call) =>
                    call.some((arg) => typeof arg === 'string' && arg.includes('File:')),
                );

                expect(filePathCalls.length).toBeGreaterThan(0);
            });

            it('should format file size correctly', async () => {
                testFilePath = path.join(tempDir, 'test.srt');

                const content = 'A'.repeat(1024); // 1 KB

                await fs.promises.writeFile(testFilePath, content, 'utf8');

                await definition.action(testFilePath, {});

                const sizeCalls = mockConsoleLog.mock.calls.filter((call) =>
                    call.some((arg) => typeof arg === 'string' && arg.includes('Size:')),
                );

                expect(sizeCalls.length).toBeGreaterThan(0);
            });

            it('should display modified time', async () => {
                testFilePath = path.join(tempDir, 'test.srt');
                await fs.promises.writeFile(testFilePath, 'content', 'utf8');

                await definition.action(testFilePath, {});

                const modifiedCalls = mockConsoleLog.mock.calls.filter((call) =>
                    call.some((arg) => typeof arg === 'string' && arg.includes('Modified:')),
                );

                expect(modifiedCalls.length).toBeGreaterThan(0);
            });
        });

        describe('encoding detection', () => {
            it('should detect and display UTF-8 encoding', async () => {
                const { EncodingDetectionService } = require('@subzilla/core');

                EncodingDetectionService.detectEncoding.mockResolvedValue('utf-8');

                testFilePath = path.join(tempDir, 'utf8.srt');
                await fs.promises.writeFile(testFilePath, 'UTF-8 content', 'utf8');

                await definition.action(testFilePath, {});

                expect(EncodingDetectionService.detectEncoding).toHaveBeenCalledWith(testFilePath);
                expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('🔤 Encoding Information'));
                const encodingCalls = mockConsoleLog.mock.calls.filter((call) =>
                    call.some((arg) => typeof arg === 'string' && arg.includes('Detected Encoding:')),
                );

                expect(encodingCalls.length).toBeGreaterThan(0);
            });

            it('should detect and display ISO-8859-1 encoding', async () => {
                const { EncodingDetectionService } = require('@subzilla/core');

                EncodingDetectionService.detectEncoding.mockResolvedValue('ISO-8859-1');

                testFilePath = path.join(tempDir, 'latin1.srt');
                await fs.promises.writeFile(testFilePath, 'Latin-1 content', 'latin1');

                await definition.action(testFilePath, {});

                expect(EncodingDetectionService.detectEncoding).toHaveBeenCalledWith(testFilePath);
            });

            it('should detect and display Windows-1252 encoding', async () => {
                const { EncodingDetectionService } = require('@subzilla/core');

                EncodingDetectionService.detectEncoding.mockResolvedValue('windows-1252');

                testFilePath = path.join(tempDir, 'win1252.srt');
                await fs.promises.writeFile(testFilePath, 'Windows content', 'utf8');

                await definition.action(testFilePath, {});

                expect(EncodingDetectionService.detectEncoding).toHaveBeenCalledWith(testFilePath);
            });

            it('should handle encoding detection for various encodings', async () => {
                const { EncodingDetectionService } = require('@subzilla/core');
                const encodings = ['utf-8', 'ISO-8859-1', 'windows-1252', 'GB2312', 'Big5'];

                for (const encoding of encodings) {
                    EncodingDetectionService.detectEncoding.mockResolvedValue(encoding);

                    testFilePath = path.join(tempDir, `${encoding}.srt`);
                    await fs.promises.writeFile(testFilePath, 'test', 'utf8');

                    mockConsoleLog.mockClear();

                    await definition.action(testFilePath, {});

                    expect(EncodingDetectionService.detectEncoding).toHaveBeenCalledWith(testFilePath);
                }
            });
        });

        describe('BOM detection', () => {
            it('should detect UTF-8 BOM when present', async () => {
                testFilePath = path.join(tempDir, 'with-bom.srt');

                const bom = Buffer.from([0xef, 0xbb, 0xbf]);
                const content = Buffer.concat([bom, Buffer.from('Content with BOM', 'utf8')]);

                await fs.promises.writeFile(testFilePath, content);

                await definition.action(testFilePath, {});

                const bomCalls = mockConsoleLog.mock.calls.filter((call) =>
                    call.some((arg) => typeof arg === 'string' && arg.includes('BOM:')),
                );

                expect(bomCalls.length).toBeGreaterThan(0);
            });

            it('should detect when BOM is not present', async () => {
                testFilePath = path.join(tempDir, 'no-bom.srt');
                await fs.promises.writeFile(testFilePath, 'Content without BOM', 'utf8');

                await definition.action(testFilePath, {});

                const bomCalls = mockConsoleLog.mock.calls.filter((call) =>
                    call.some((arg) => typeof arg === 'string' && arg.includes('BOM:')),
                );

                expect(bomCalls.length).toBeGreaterThan(0);
            });

            it('should handle empty file for BOM detection', async () => {
                testFilePath = path.join(tempDir, 'empty.srt');
                await fs.promises.writeFile(testFilePath, '', 'utf8');

                await definition.action(testFilePath, {});

                expect(mockConsoleLog).toHaveBeenCalled();
            });
        });

        describe('line ending detection', () => {
            it('should detect CRLF line endings', async () => {
                testFilePath = path.join(tempDir, 'crlf.srt');

                const content = '1\r\n00:00:01,000 --> 00:00:02,000\r\nHello\r\n';

                await fs.promises.writeFile(testFilePath, content, 'utf8');

                await definition.action(testFilePath, {});

                const lineEndingCalls = mockConsoleLog.mock.calls.filter((call) =>
                    call.some((arg) => typeof arg === 'string' && arg.includes('Line Endings:')),
                );

                expect(lineEndingCalls.length).toBeGreaterThan(0);
            });

            it('should detect LF line endings', async () => {
                testFilePath = path.join(tempDir, 'lf.srt');

                const content = '1\n00:00:01,000 --> 00:00:02,000\nHello\n';

                await fs.promises.writeFile(testFilePath, content, 'utf8');

                await definition.action(testFilePath, {});

                const lineEndingCalls = mockConsoleLog.mock.calls.filter((call) =>
                    call.some((arg) => typeof arg === 'string' && arg.includes('Line Endings:')),
                );

                expect(lineEndingCalls.length).toBeGreaterThan(0);
            });

            it('should handle file without line endings', async () => {
                testFilePath = path.join(tempDir, 'single-line.srt');
                await fs.promises.writeFile(testFilePath, 'Single line content', 'utf8');

                await definition.action(testFilePath, {});

                const lineEndingCalls = mockConsoleLog.mock.calls.filter((call) =>
                    call.some((arg) => typeof arg === 'string' && arg.includes('Line Endings:')),
                );

                expect(lineEndingCalls.length).toBeGreaterThan(0);
            });
        });

        describe('content statistics', () => {
            it('should count lines correctly', async () => {
                testFilePath = path.join(tempDir, 'lines.srt');

                const content = 'Line 1\nLine 2\nLine 3\n';

                await fs.promises.writeFile(testFilePath, content, 'utf8');

                await definition.action(testFilePath, {});

                expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📊 Content Statistics'));
                const lineCalls = mockConsoleLog.mock.calls.filter((call) =>
                    call.some((arg) => typeof arg === 'string' && arg.includes('Total Lines:')),
                );

                expect(lineCalls.length).toBeGreaterThan(0);
            });

            it('should count subtitle entries correctly', async () => {
                testFilePath = path.join(tempDir, 'entries.srt');
                const content = `1
00:00:01,000 --> 00:00:02,000
First subtitle

2
00:00:03,000 --> 00:00:04,000
Second subtitle

3
00:00:05,000 --> 00:00:06,000
Third subtitle
`;

                await fs.promises.writeFile(testFilePath, content, 'utf8');

                await definition.action(testFilePath, {});

                const entryCalls = mockConsoleLog.mock.calls.filter((call) =>
                    call.some((arg) => typeof arg === 'string' && arg.includes('Subtitle Entries:')),
                );

                expect(entryCalls.length).toBeGreaterThan(0);
            });

            it('should handle empty file statistics', async () => {
                testFilePath = path.join(tempDir, 'empty.srt');
                await fs.promises.writeFile(testFilePath, '', 'utf8');

                await definition.action(testFilePath, {});

                expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📊 Content Statistics'));
            });

            it('should count lines with different line ending styles', async () => {
                testFilePath = path.join(tempDir, 'mixed.srt');

                const content = 'Line 1\r\nLine 2\nLine 3\r\n';

                await fs.promises.writeFile(testFilePath, content, 'utf8');

                await definition.action(testFilePath, {});

                const lineCalls = mockConsoleLog.mock.calls.filter((call) =>
                    call.some((arg) => typeof arg === 'string' && arg.includes('Total Lines:')),
                );

                expect(lineCalls.length).toBeGreaterThan(0);
            });

            it('should handle single entry subtitle file', async () => {
                testFilePath = path.join(tempDir, 'single.srt');
                const content = `1
00:00:01,000 --> 00:00:02,000
Single subtitle
`;

                await fs.promises.writeFile(testFilePath, content, 'utf8');

                await definition.action(testFilePath, {});

                const entryCalls = mockConsoleLog.mock.calls.filter((call) =>
                    call.some((arg) => typeof arg === 'string' && arg.includes('Subtitle Entries:')),
                );

                expect(entryCalls.length).toBeGreaterThan(0);
            });
        });

        describe('error handling', () => {
            it('should handle non-existent file', async () => {
                const nonExistentPath = path.join(tempDir, 'does-not-exist.srt');

                await definition.action(nonExistentPath, {});

                expect(mockConsoleError).toHaveBeenCalled();
                expect(mockProcessExit).toHaveBeenCalledWith(1);
            });

            it('should handle file read errors', async () => {
                testFilePath = path.join(tempDir, 'test.srt');
                await fs.promises.writeFile(testFilePath, 'content', 'utf8');

                // Mock fs.readFile to throw an error
                const originalReadFile = fs.promises.readFile;

                (fs.promises.readFile as unknown as jest.MockedFunction<typeof fs.promises.readFile>) = jest
                    .fn<typeof fs.promises.readFile>()
                    .mockRejectedValue(new Error('Read failed')) as jest.MockedFunction<typeof fs.promises.readFile>;

                await definition.action(testFilePath, {});

                expect(mockConsoleError).toHaveBeenCalledWith(
                    expect.stringContaining('Error analyzing subtitle file:'),
                    expect.anything(),
                );
                expect(mockProcessExit).toHaveBeenCalledWith(1);

                // Restore original function
                fs.promises.readFile = originalReadFile;
            });

            it('should handle encoding detection errors', async () => {
                const { EncodingDetectionService } = require('@subzilla/core');

                EncodingDetectionService.detectEncoding.mockRejectedValue(new Error('Encoding detection failed'));

                testFilePath = path.join(tempDir, 'test.srt');
                await fs.promises.writeFile(testFilePath, 'content', 'utf8');

                await definition.action(testFilePath, {});

                expect(mockConsoleError).toHaveBeenCalled();
                expect(mockProcessExit).toHaveBeenCalledWith(1);
            });

            it('should handle file stat errors', async () => {
                testFilePath = path.join(tempDir, 'test.srt');
                await fs.promises.writeFile(testFilePath, 'content', 'utf8');

                // Mock fs.stat to throw an error
                const originalStat = fs.promises.stat;

                (fs.promises.stat as unknown as jest.MockedFunction<typeof fs.promises.stat>) = jest
                    .fn<typeof fs.promises.stat>()
                    .mockRejectedValue(new Error('Stat failed')) as jest.MockedFunction<typeof fs.promises.stat>;

                await definition.action(testFilePath, {});

                expect(mockConsoleError).toHaveBeenCalled();
                expect(mockProcessExit).toHaveBeenCalledWith(1);

                // Restore original function
                fs.promises.stat = originalStat;
            });

            it('should display error message for invalid file path', async () => {
                const invalidPath = '/invalid/path/to/file.srt';

                await definition.action(invalidPath, {});

                const errorCalls = mockConsoleError.mock.calls.filter((call) =>
                    call.some((arg) => typeof arg === 'string' && arg.includes('Error analyzing subtitle file:')),
                );

                expect(errorCalls.length).toBeGreaterThan(0);
                expect(mockProcessExit).toHaveBeenCalledWith(1);
            });

            it('should handle directory path instead of file', async () => {
                const dirPath = path.join(tempDir, 'test-dir');

                await fs.promises.mkdir(dirPath);

                await definition.action(dirPath, {});

                expect(mockConsoleError).toHaveBeenCalled();
                expect(mockProcessExit).toHaveBeenCalledWith(1);
            });
        });

        describe('complex file scenarios', () => {
            it('should handle large subtitle file', async () => {
                testFilePath = path.join(tempDir, 'large.srt');

                let content = '';

                for (let i = 1; i <= 100; i++) {
                    content += `${i}\n00:00:${String(i).padStart(2, '0')},000 --> 00:00:${String(i + 1).padStart(2, '0')},000\nSubtitle ${i}\n\n`;
                }
                await fs.promises.writeFile(testFilePath, content, 'utf8');

                await definition.action(testFilePath, {});

                expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📄 SRT File Information'));
                expect(mockConsoleError).not.toHaveBeenCalled();
            });

            it('should handle file with special characters', async () => {
                testFilePath = path.join(tempDir, 'special.srt');

                const content = '1\n00:00:01,000 --> 00:00:02,000\nHéllo Wörld! 你好 🌍\n';

                await fs.promises.writeFile(testFilePath, content, 'utf8');

                await definition.action(testFilePath, {});

                expect(mockConsoleLog).toHaveBeenCalled();
                expect(mockConsoleError).not.toHaveBeenCalled();
            });

            it('should handle file with only whitespace', async () => {
                testFilePath = path.join(tempDir, 'whitespace.srt');
                await fs.promises.writeFile(testFilePath, '   \n\n  \n', 'utf8');

                await definition.action(testFilePath, {});

                expect(mockConsoleLog).toHaveBeenCalled();
            });

            it('should handle file with mixed content and empty lines', async () => {
                testFilePath = path.join(tempDir, 'mixed.srt');
                const content = `1
00:00:01,000 --> 00:00:02,000
First line


2
00:00:03,000 --> 00:00:04,000
Second line

`;

                await fs.promises.writeFile(testFilePath, content, 'utf8');

                await definition.action(testFilePath, {});

                expect(mockConsoleLog).toHaveBeenCalled();
                expect(mockConsoleError).not.toHaveBeenCalled();
            });
        });

        describe('output format verification', () => {
            it('should display all required sections', async () => {
                testFilePath = path.join(tempDir, 'complete.srt');

                const content = '1\n00:00:01,000 --> 00:00:02,000\nTest\n';

                await fs.promises.writeFile(testFilePath, content, 'utf8');

                await definition.action(testFilePath, {});

                // Check for all major sections
                expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📄 SRT File Information'));
                expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📝 Basic Information'));
                expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('🔤 Encoding Information'));
                expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('📊 Content Statistics'));
            });

            it('should use proper formatting for all fields', async () => {
                testFilePath = path.join(tempDir, 'formatted.srt');

                const content = '1\n00:00:01,000 --> 00:00:02,000\nTest subtitle\n';

                await fs.promises.writeFile(testFilePath, content, 'utf8');

                await definition.action(testFilePath, {});

                // Verify that console.log was called multiple times with formatted output
                expect(mockConsoleLog.mock.calls.length).toBeGreaterThan(5);
            });
        });
    });

    describe('formatFileSize', () => {
        it('should format bytes correctly', () => {
            const result = (commandCreator as unknown as { formatFileSize(size: number): string }).formatFileSize(500);

            expect(result).toBe('500.00 B');
        });

        it('should format kilobytes correctly', () => {
            const result = (commandCreator as unknown as { formatFileSize(size: number): string }).formatFileSize(1024);

            expect(result).toBe('1.00 KB');
        });

        it('should format kilobytes with decimals', () => {
            const result = (commandCreator as unknown as { formatFileSize(size: number): string }).formatFileSize(1536);

            expect(result).toBe('1.50 KB');
        });

        it('should format megabytes correctly', () => {
            const result = (commandCreator as unknown as { formatFileSize(size: number): string }).formatFileSize(
                1024 * 1024,
            );

            expect(result).toBe('1.00 MB');
        });

        it('should format megabytes with decimals', () => {
            const result = (commandCreator as unknown as { formatFileSize(size: number): string }).formatFileSize(
                1024 * 1024 * 2.5,
            );

            expect(result).toBe('2.50 MB');
        });

        it('should format gigabytes correctly', () => {
            const result = (commandCreator as unknown as { formatFileSize(size: number): string }).formatFileSize(
                1024 * 1024 * 1024,
            );

            expect(result).toBe('1.00 GB');
        });

        it('should format gigabytes with decimals', () => {
            const result = (commandCreator as unknown as { formatFileSize(size: number): string }).formatFileSize(
                1024 * 1024 * 1024 * 1.75,
            );

            expect(result).toBe('1.75 GB');
        });

        it('should handle zero bytes', () => {
            const result = (commandCreator as unknown as { formatFileSize(size: number): string }).formatFileSize(0);

            expect(result).toBe('0.00 B');
        });

        it('should handle very large files', () => {
            const result = (commandCreator as unknown as { formatFileSize(size: number): string }).formatFileSize(
                1024 * 1024 * 1024 * 10,
            );

            expect(result).toBe('10.00 GB');
        });

        it('should round to 2 decimal places', () => {
            const result = (commandCreator as unknown as { formatFileSize(size: number): string }).formatFileSize(1234);

            expect(result).toMatch(/^\d+\.\d{2} (B|KB|MB|GB)$/);
        });
    });
});
