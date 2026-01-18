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

    describe('Timestamp Recovery', () => {
        it('should detect corrupted timestamps like "000000039  000035039"', async () => {
            const inputPath = path.join(tempDir, 'corrupted.srt');
            // This is what happens when punctuation is stripped from timestamps
            // "00:00:00,039 --> 00:00:35,039" becomes "000000039  000035039"
            const corruptedContent = `1
000000039  000035039
Hello World

2
000035039  000105039
Second subtitle`;

            await fs.promises.writeFile(inputPath, corruptedContent, 'utf8');

            const result = await processor.processFile(inputPath);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Timestamps should be recovered
            expect(outputContent).toContain('00:00:00,039 --> 00:00:35,039');
            expect(outputContent).toContain('00:00:35,039 --> 00:01:05,039');
            expect(outputContent).not.toContain('000000039  000035039');
        });

        it('should recover timestamps converting "000000039  000035039" back to "00:00:00,039 --> 00:00:35,039"', async () => {
            const inputPath = path.join(tempDir, 'recover.srt');
            const corruptedContent = `1
000000039  000035039
Test content`;

            await fs.promises.writeFile(inputPath, corruptedContent, 'utf8');

            const result = await processor.processFile(inputPath);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Verify exact format recovery
            expect(outputContent).toMatch(/00:00:00,039 --> 00:00:35,039/);
        });

        it('should not modify valid timestamps', async () => {
            const inputPath = path.join(tempDir, 'valid.srt');
            const validContent = `1
00:00:00,039 --> 00:00:35,039
Hello World

2
00:01:05,000 --> 00:01:10,500
Second subtitle`;

            await fs.promises.writeFile(inputPath, validContent, 'utf8');

            const result = await processor.processFile(inputPath);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Valid timestamps should remain unchanged
            expect(outputContent).toContain('00:00:00,039 --> 00:00:35,039');
            expect(outputContent).toContain('00:01:05,000 --> 00:01:10,500');
        });

        it('should handle mixed valid and corrupted timestamps', async () => {
            const inputPath = path.join(tempDir, 'mixed.srt');
            // This shouldn't happen in practice, but test robustness
            const mixedContent = `1
000000039  000035039
First subtitle

2
00:01:05,000 --> 00:01:10,500
Valid timestamp

3
000115000  000120500
Third corrupted`;

            await fs.promises.writeFile(inputPath, mixedContent, 'utf8');

            const result = await processor.processFile(inputPath);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Corrupted timestamps should be recovered
            expect(outputContent).toContain('00:00:00,039 --> 00:00:35,039');
            expect(outputContent).toContain('00:01:15,000 --> 00:01:20,500');
            // Valid timestamps should remain unchanged
            expect(outputContent).toContain('00:01:05,000 --> 00:01:10,500');
        });

        it('should handle edge case with hours in timestamps', async () => {
            const inputPath = path.join(tempDir, 'hours.srt');
            // Test with hours: "01:30:45,123 --> 02:00:00,000" becomes "013045123  020000000"
            const corruptedContent = `1
013045123  020000000
Long movie subtitle`;

            await fs.promises.writeFile(inputPath, corruptedContent, 'utf8');

            const result = await processor.processFile(inputPath);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('01:30:45,123 --> 02:00:00,000');
        });

        it('should handle timestamps with maximum valid values', async () => {
            const inputPath = path.join(tempDir, 'max-values.srt');
            // Maximum values: 99:59:59,999
            const corruptedContent = `1
995959999  995959999
Max timestamp subtitle`;

            await fs.promises.writeFile(inputPath, corruptedContent, 'utf8');

            const result = await processor.processFile(inputPath);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('99:59:59,999 --> 99:59:59,999');
        });

        it('should preserve content that looks similar but is not a corrupted timestamp', async () => {
            const inputPath = path.join(tempDir, 'similar.srt');
            // 8-digit numbers should not be treated as corrupted timestamps
            const content = `1
00:00:01,000 --> 00:00:05,000
Phone number: 12345678

2
00:00:06,000 --> 00:00:10,000
ID: 000000001`;

            await fs.promises.writeFile(inputPath, content, 'utf8');

            const result = await processor.processFile(inputPath);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // These are in subtitle text, not on timestamp lines, so should be preserved
            expect(outputContent).toContain('12345678');
            expect(outputContent).toContain('000000001');
        });

        it('should recover timestamps with CRLF line endings', async () => {
            const inputPath = path.join(tempDir, 'crlf.srt');
            const corruptedContent = '1\r\n000000039  000035039\r\nHello World\r\n';

            await fs.promises.writeFile(inputPath, corruptedContent, 'utf8');

            const result = await processor.processFile(inputPath);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('00:00:00,039 --> 00:00:35,039');
        });

        it('should handle empty file without errors when checking for corrupted timestamps', async () => {
            const inputPath = path.join(tempDir, 'empty-check.srt');

            await fs.promises.writeFile(inputPath, '', 'utf8');

            const result = await processor.processFile(inputPath);

            expect(fs.existsSync(result.outputPath)).toBe(true);
        });

        it('should handle file with only whitespace', async () => {
            const inputPath = path.join(tempDir, 'whitespace.srt');

            await fs.promises.writeFile(inputPath, '   \n\n   \n', 'utf8');

            const result = await processor.processFile(inputPath);

            expect(fs.existsSync(result.outputPath)).toBe(true);
        });
    });

    describe('Safe Strip Options', () => {
        it('should block timestamps strip option to prevent SRT corruption', async () => {
            const inputPath = path.join(tempDir, 'safe-timestamps.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello World

2
00:00:04,000 --> 00:00:06,000
Second subtitle`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                strip: {
                    timestamps: true, // This MUST be blocked
                    html: true, // This should work normally
                },
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Timestamps MUST be preserved (not replaced with [TIMESTAMP])
            expect(outputContent).toContain('00:00:01,000 --> 00:00:03,000');
            expect(outputContent).toContain('00:00:04,000 --> 00:00:06,000');
            expect(outputContent).not.toContain('[TIMESTAMP]');
        });

        it('should block numbers strip option to prevent SRT corruption', async () => {
            const inputPath = path.join(tempDir, 'safe-numbers.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Episode 5 is great

2
00:00:04,000 --> 00:00:06,000
Season 2 finale`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                strip: {
                    numbers: true, // This MUST be blocked
                },
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Sequence numbers MUST be preserved
            expect(outputContent).toMatch(/^1\n/m);
            expect(outputContent).toMatch(/^2\n/m);
            // Numbers in timestamp should also be preserved
            expect(outputContent).toContain('00:00:01,000');
            // Numbers in content should also be preserved (since we block the option)
            expect(outputContent).toContain('Episode 5');
            expect(outputContent).toContain('Season 2');
        });

        it('should block punctuation strip option to prevent SRT corruption', async () => {
            const inputPath = path.join(tempDir, 'safe-punctuation.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello, world!

2
00:00:04,000 --> 00:00:06,000
How are you?`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                strip: {
                    punctuation: true, // This MUST be blocked
                },
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Timestamp punctuation MUST be preserved (colons, commas, arrow)
            expect(outputContent).toContain('00:00:01,000 --> 00:00:03,000');
            expect(outputContent).toContain(':');
            expect(outputContent).toContain(',');
            expect(outputContent).toContain('-->');
            // Content punctuation is also preserved since option is blocked
            expect(outputContent).toContain('Hello, world!');
            expect(outputContent).toContain('How are you?');
        });

        it('should block brackets strip option to prevent SRT corruption', async () => {
            const inputPath = path.join(tempDir, 'safe-brackets.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
[Music playing]

2
00:00:04,000 --> 00:00:06,000
(Door closes)`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                strip: {
                    brackets: true, // This MUST be blocked
                },
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Brackets should be preserved since option is blocked
            expect(outputContent).toContain('[Music playing]');
            expect(outputContent).toContain('(Door closes)');
        });

        it('should block all dangerous options simultaneously', async () => {
            const inputPath = path.join(tempDir, 'safe-all.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
[Note] Episode 5! How exciting?

2
00:00:04,000 --> 00:00:06,000
<b>Bold text</b>`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                strip: {
                    timestamps: true, // Blocked
                    numbers: true, // Blocked
                    punctuation: true, // Blocked
                    brackets: true, // Blocked
                    html: true, // This should work
                },
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Timestamps preserved
            expect(outputContent).toContain('00:00:01,000 --> 00:00:03,000');
            // Sequence numbers preserved
            expect(outputContent).toMatch(/^1\n/m);
            expect(outputContent).toMatch(/^2\n/m);
            // Punctuation preserved
            expect(outputContent).toContain('!');
            expect(outputContent).toContain('?');
            // Brackets preserved
            expect(outputContent).toContain('[Note]');
            // HTML stripped (this option is allowed)
            expect(outputContent).toContain('Bold text');
            expect(outputContent).not.toContain('<b>');
        });

        it('should allow safe strip options like html, urls, emojis, colors, styles', async () => {
            const inputPath = path.join(tempDir, 'safe-allowed.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
<b>Visit</b> https://example.com {\\c&H0000FF&}Blue text

2
00:00:04,000 --> 00:00:06,000
Hello 😊 world`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                strip: {
                    html: true, // Allowed
                    urls: true, // Allowed
                    colors: true, // Allowed
                    emojis: true, // Allowed
                },
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Safe strip options should work
            expect(outputContent).not.toContain('<b>');
            expect(outputContent).not.toContain('</b>');
            expect(outputContent).toContain('[URL]');
            expect(outputContent).not.toContain('https://');
            expect(outputContent).not.toContain('{\\c&H0000FF&}');
            expect(outputContent).toContain('[EMOJI]');
            expect(outputContent).not.toContain('😊');
            // But SRT structure preserved
            expect(outputContent).toContain('00:00:01,000 --> 00:00:03,000');
        });

        it('should handle undefined strip options gracefully', async () => {
            const inputPath = path.join(tempDir, 'undefined-strip.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello World`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            // No strip options at all
            const result = await processor.processFile(inputPath);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('Hello World');
            expect(outputContent).toContain('00:00:01,000 --> 00:00:03,000');
        });

        it('should handle empty strip options object', async () => {
            const inputPath = path.join(tempDir, 'empty-strip.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello World`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                strip: {}, // Empty strip options
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('Hello World');
            expect(outputContent).toContain('00:00:01,000 --> 00:00:03,000');
        });
    });
});
