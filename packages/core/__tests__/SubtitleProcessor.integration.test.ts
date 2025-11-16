import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { IConvertOptions } from '@subzilla/types';

import SubtitleProcessor from '../src/SubtitleProcessor';

describe('SubtitleProcessor Integration Tests', () => {
    let processor: SubtitleProcessor;
    let tempDir: string;

    beforeEach(async () => {
        processor = new SubtitleProcessor();
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subzilla-integration-'));
    });

    afterEach(async () => {
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('processFile', () => {
        it('should process a simple SRT file end-to-end', async () => {
            const inputPath = path.join(tempDir, 'input.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello World

2
00:00:04,000 --> 00:00:06,000
<b>Bold text</b>`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);

            // Verify output file exists
            expect(fs.existsSync(result.outputPath)).toBe(true);

            // Verify output content
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('Hello World');
            expect(outputContent).toContain('<b>Bold text</b>'); // HTML not stripped by default
        });

        it('should strip HTML formatting when requested', async () => {
            const inputPath = path.join(tempDir, 'input.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
<font color="red">Red text</font>

2
00:00:04,000 --> 00:00:06,000
<b>Bold</b> and <i>italic</i>`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                strip: { html: true },
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('Red text');
            expect(outputContent).toContain('Bold and italic');
            expect(outputContent).not.toContain('<font');
            expect(outputContent).not.toContain('<b>');
            expect(outputContent).not.toContain('<i>');
        });

        it('should handle Arabic content correctly', async () => {
            const inputPath = path.join(tempDir, 'arabic.srt');
            const arabicContent = `1
00:00:01,000 --> 00:00:03,000
مرحبا بالعالم

2
00:00:04,000 --> 00:00:06,000
<b>نص عريض</b>`;

            await fs.promises.writeFile(inputPath, arabicContent, 'utf8');

            const result = await processor.processFile(inputPath);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('مرحبا بالعالم');
            expect(outputContent).toContain('نص عريض');
        });

        it('should create backup when requested', async () => {
            const inputPath = path.join(tempDir, 'input.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Test content`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                backupOriginal: true,
            };

            const result = await processor.processFile(inputPath, undefined, options);

            expect(result.backupPath).toBeDefined();
            expect(fs.existsSync(result.backupPath!)).toBe(true);

            const backupContent = await fs.promises.readFile(result.backupPath!, 'utf8');

            expect(backupContent).toBe(srtContent);
        });

        it('should use custom output path when provided', async () => {
            const inputPath = path.join(tempDir, 'input.srt');
            const outputPath = path.join(tempDir, 'custom-output.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Test content`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath, outputPath);

            expect(result.outputPath).toBe(outputPath);
            expect(fs.existsSync(outputPath)).toBe(true);
        });

        it('should handle empty files gracefully', async () => {
            const inputPath = path.join(tempDir, 'empty.srt');

            await fs.promises.writeFile(inputPath, '', 'utf8');

            const result = await processor.processFile(inputPath);

            expect(fs.existsSync(result.outputPath)).toBe(true);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toBe('');
        });

        it('should add UTF-8 BOM when configured', async () => {
            const inputPath = path.join(tempDir, 'input.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Test content`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                bom: true,
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputBuffer = await fs.promises.readFile(result.outputPath);

            // Check for UTF-8 BOM (EF BB BF)
            expect(outputBuffer[0]).toBe(0xef);
            expect(outputBuffer[1]).toBe(0xbb);
            expect(outputBuffer[2]).toBe(0xbf);
        });

        it('should normalize line endings when configured', async () => {
            const inputPath = path.join(tempDir, 'input.srt');
            const srtContent = '1\r\n00:00:01,000 --> 00:00:03,000\r\nTest content\r\n';

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                lineEndings: 'lf',
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).not.toContain('\r\n');
            expect(outputContent).toContain('\n');
        });

        it('should handle multiple strip options together', async () => {
            const inputPath = path.join(tempDir, 'input.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:06,000
<font color="red">Visit https://example.com</font> for episode 123! 😊`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                strip: {
                    html: true,
                    urls: true,
                    numbers: true,
                    emojis: true,
                },
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // IMPORTANT: numbers should NOT be stripped to preserve SRT structure
            // The SubtitleProcessor now ignores strip.numbers to prevent file corruption
            expect(outputContent).toContain('Visit [URL] for episode 123! [EMOJI]');
            expect(outputContent).not.toContain('<font');
            expect(outputContent).not.toContain('https://');
            expect(outputContent).toContain('123'); // Numbers preserved to prevent corruption
            expect(outputContent).not.toContain('😊');
        });

        it('should preserve SRT structure even when timestamps strip option is true (prevent corruption)', async () => {
            const inputPath = path.join(tempDir, 'input.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello World

2
00:00:04,000 --> 00:00:06,000
Second subtitle`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                strip: {
                    timestamps: true, // This should be ignored to prevent corruption
                },
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Timestamps should NOT be stripped - they are essential for SRT structure
            expect(outputContent).toContain('00:00:01,000 --> 00:00:03,000');
            expect(outputContent).toContain('00:00:04,000 --> 00:00:06,000');
            expect(outputContent).not.toContain('[TIMESTAMP]');
        });

        it('should preserve sequence numbers even when numbers strip option is true (prevent corruption)', async () => {
            const inputPath = path.join(tempDir, 'input.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello World

2
00:00:04,000 --> 00:00:06,000
Second subtitle`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                strip: {
                    numbers: true, // This should be ignored to prevent corruption
                },
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Sequence numbers should NOT be stripped - they are essential for SRT structure
            expect(outputContent).toMatch(/^1\n/m); // Subtitle sequence number preserved
            expect(outputContent).toMatch(/^2\n/m); // Subtitle sequence number preserved
            expect(outputContent).not.toContain('#');
        });

        it('should not add double BOM when input already has BOM', async () => {
            const inputPath = path.join(tempDir, 'bom-input.srt');
            const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Test content`;

            // Write file with BOM
            const contentWithBom = Buffer.concat([UTF8_BOM, Buffer.from(srtContent, 'utf8')]);

            await fs.promises.writeFile(inputPath, contentWithBom);

            const options: IConvertOptions = {
                bom: true, // Request BOM in output
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputBuffer = await fs.promises.readFile(result.outputPath);

            // Should have exactly one BOM (3 bytes), not double BOM (6 bytes)
            expect(outputBuffer[0]).toBe(0xef);
            expect(outputBuffer[1]).toBe(0xbb);
            expect(outputBuffer[2]).toBe(0xbf);
            // The next character should NOT be another BOM
            expect(outputBuffer.slice(3, 6).equals(UTF8_BOM)).toBe(false);

            // Content should start with '1' after the single BOM
            const contentAfterBom = outputBuffer.slice(3).toString('utf8');

            expect(contentAfterBom.startsWith('1')).toBe(true);
        });

        it('should throw error for non-existent input file', async () => {
            const nonExistentPath = path.join(tempDir, 'nonexistent.srt');

            await expect(processor.processFile(nonExistentPath)).rejects.toThrow();
        });

        it('should handle large files efficiently', async () => {
            const inputPath = path.join(tempDir, 'large.srt');

            // Create a large SRT file
            let largeContent = '';

            for (let i = 1; i <= 1000; i++) {
                largeContent += `${i}
00:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')},000 --> 00:${String(Math.floor((i + 2) / 60)).padStart(2, '0')}:${String((i + 2) % 60).padStart(2, '0')},000
Subtitle line ${i} with some <b>formatting</b>

`;
            }

            await fs.promises.writeFile(inputPath, largeContent, 'utf8');

            const startTime = Date.now();
            const result = await processor.processFile(inputPath);
            const endTime = Date.now();

            expect(fs.existsSync(result.outputPath)).toBe(true);
            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('Subtitle line 1');
            expect(outputContent).toContain('Subtitle line 1000');
        });
    });
});
