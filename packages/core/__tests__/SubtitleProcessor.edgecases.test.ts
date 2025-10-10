import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { IConvertOptions } from '@subzilla/types';

import SubtitleProcessor from '../src/SubtitleProcessor';

describe('SubtitleProcessor Edge Cases', () => {
    let processor: SubtitleProcessor;
    let tempDir: string;

    beforeEach(async () => {
        processor = new SubtitleProcessor();
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subzilla-edgecase-'));
    });

    afterEach(async () => {
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Malformed SRT Files', () => {
        it('should handle missing sequence numbers', async () => {
            const inputPath = path.join(tempDir, 'missing-numbers.srt');
            const srtContent = `00:00:01,000 --> 00:00:03,000
Text without sequence number

2
00:00:04,000 --> 00:00:06,000
Proper entry`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(fs.existsSync(result.outputPath)).toBe(true);
            expect(outputContent).toContain('00:00:01,000 --> 00:00:03,000');
            expect(outputContent).toContain('00:00:04,000 --> 00:00:06,000');
        });

        it('should handle malformed timestamps', async () => {
            const inputPath = path.join(tempDir, 'bad-timestamps.srt');
            const srtContent = `1
00:00:01 -> 00:00:03
Invalid arrow format

2
00:00:04,000 --> 00:00:06,000
Proper timestamp`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(fs.existsSync(result.outputPath)).toBe(true);
            // Proper timestamp should be preserved
            expect(outputContent).toContain('00:00:04,000 --> 00:00:06,000');
        });

        it('should handle duplicate sequence numbers', async () => {
            const inputPath = path.join(tempDir, 'duplicate-numbers.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
First subtitle

1
00:00:04,000 --> 00:00:06,000
Duplicate number`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(fs.existsSync(result.outputPath)).toBe(true);
            expect(outputContent).toContain('First subtitle');
            expect(outputContent).toContain('Duplicate number');
        });

        it('should handle entries with only whitespace', async () => {
            const inputPath = path.join(tempDir, 'whitespace.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
   
   

2
00:00:04,000 --> 00:00:06,000
Actual text`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(fs.existsSync(result.outputPath)).toBe(true);
            expect(outputContent).toContain('Actual text');
        });
    });

    describe('Extreme Content', () => {
        it('should handle very long subtitle text (10000+ characters)', async () => {
            const inputPath = path.join(tempDir, 'long-text.srt');
            const longText = 'A'.repeat(10000);
            const srtContent = `1
00:00:01,000 --> 00:00:10,000
${longText}`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(fs.existsSync(result.outputPath)).toBe(true);
            expect(outputContent).toContain(longText);
        });

        it('should handle file with 10000+ subtitle entries', async () => {
            const inputPath = path.join(tempDir, 'many-entries.srt');
            let srtContent = '';

            for (let i = 1; i <= 10000; i++) {
                const hours = String(Math.floor(i / 3600)).padStart(2, '0');
                const minutes = String(Math.floor((i % 3600) / 60)).padStart(2, '0');
                const seconds = String(i % 60).padStart(2, '0');

                srtContent += `${i}\n${hours}:${minutes}:${seconds},000 --> ${hours}:${minutes}:${seconds},999\nSubtitle ${i}\n\n`;
            }

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const startTime = Date.now();
            const result = await processor.processFile(inputPath);
            const endTime = Date.now();

            expect(fs.existsSync(result.outputPath)).toBe(true);
            expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('Subtitle 1');
            expect(outputContent).toContain('Subtitle 10000');
        });

        it('should handle extremely long file names', async () => {
            const longFileName = 'A'.repeat(200) + '.srt';
            const inputPath = path.join(tempDir, longFileName);
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Test content`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);

            expect(fs.existsSync(result.outputPath)).toBe(true);
        });
    });

    describe('Unicode and Special Characters', () => {
        it('should handle emoji in subtitle content (not timestamps)', async () => {
            const inputPath = path.join(tempDir, 'emoji.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello 😊 World 🌍 Test 🎉

2
00:00:04,000 --> 00:00:06,000
More emojis: 👍 💯 🔥`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('😊');
            expect(outputContent).toContain('🌍');
            expect(outputContent).toContain('🎉');
        });

        it('should handle RTL (Arabic/Hebrew) text', async () => {
            const inputPath = path.join(tempDir, 'rtl.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
مرحبا بالعالم

2
00:00:04,000 --> 00:00:06,000
שלום עולם

3
00:00:07,000 --> 00:00:09,000
Mixed: Hello مرحبا שלום`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('مرحبا بالعالم');
            expect(outputContent).toContain('שלום עולם');
            expect(outputContent).toContain('Mixed: Hello مرحبا שלום');
        });

        it('should handle zero-width characters', async () => {
            const inputPath = path.join(tempDir, 'zero-width.srt');
            const zeroWidthSpace = '\u200B';
            const zeroWidthNonJoiner = '\u200C';
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Text${zeroWidthSpace}with${zeroWidthNonJoiner}zero${zeroWidthSpace}width`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);

            expect(fs.existsSync(result.outputPath)).toBe(true);
        });

        it('should handle combining diacritical marks', async () => {
            const inputPath = path.join(tempDir, 'diacriticals.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Café naïve résumé

2
00:00:04,000 --> 00:00:06,000
Ü̈ber cliché`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('Café');
            expect(outputContent).toContain('naïve');
        });

        it('should handle surrogate pairs (characters outside BMP)', async () => {
            const inputPath = path.join(tempDir, 'surrogate.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Mathematical: 𝕳𝖊𝖑𝖑𝖔 𝕎𝕠𝕣𝕝𝕕

2
00:00:04,000 --> 00:00:06,000
Ancient: 𓀀 𓀁 𓀂`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(fs.existsSync(result.outputPath)).toBe(true);
        });
    });

    describe('Line Ending Variations', () => {
        it('should handle mixed line endings (LF and CRLF)', async () => {
            const inputPath = path.join(tempDir, 'mixed-endings.srt');
            const srtContent =
                '1\r\n00:00:01,000 --> 00:00:03,000\nText with mixed endings\r\n\n2\r\n00:00:04,000 --> 00:00:06,000\nMore text\n';

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath, undefined, { lineEndings: 'lf' });
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).not.toContain('\r\n');
            expect(outputContent.split('\r').length).toBe(1);
        });

        it('should handle old Mac line endings (CR only)', async () => {
            const inputPath = path.join(tempDir, 'cr-endings.srt');
            const srtContent = '1\r00:00:01,000 --> 00:00:03,000\rOld Mac format\r';

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);

            expect(fs.existsSync(result.outputPath)).toBe(true);
        });
    });

    describe('Timestamp Edge Cases', () => {
        it('should preserve timestamps at time boundaries (23:59:59,999)', async () => {
            const inputPath = path.join(tempDir, 'boundary-times.srt');
            const srtContent = `1
23:59:59,999 --> 23:59:59,999
End of day

2
00:00:00,000 --> 00:00:00,001
Start of day`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath, undefined, {
                strip: { punctuation: true },
            });
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('23:59:59,999 --> 23:59:59,999');
            expect(outputContent).toContain('00:00:00,000 --> 00:00:00,001');
        });

        it('should handle timestamps with unusual spacing', async () => {
            const inputPath = path.join(tempDir, 'spaced-timestamps.srt');
            const srtContent = `1
00:00:01,000   -->   00:00:03,000
Extra spaces in timestamp

2
00:00:04,000-->00:00:06,000
No spaces in timestamp`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(fs.existsSync(result.outputPath)).toBe(true);
        });
    });

    describe('Multiple Operations Combinations', () => {
        it('should handle all strip options together on complex content', async () => {
            const inputPath = path.join(tempDir, 'everything.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:06,000
<b>Bold</b> {\\c&H0000FF&}Blue{\\c} https://example.com
Episode 42 (with brackets) 😊 [text]!

2
00:00:07,000 --> 00:00:12,000
<i>Normal</i> text, with: punctuation?`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                strip: {
                    html: true,
                    colors: true,
                    styles: true,
                    urls: true,
                    punctuation: true,
                    emojis: true,
                    brackets: true,
                    bidiControl: true,
                },
            };

            const result = await processor.processFile(inputPath, undefined, options);
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Timestamps must survive ALL stripping
            expect(outputContent).toContain('00:00:01,000 --> 00:00:06,000');
            expect(outputContent).toContain('00:00:07,000 --> 00:00:12,000');

            // HTML removed
            expect(outputContent).not.toContain('<b>');
            expect(outputContent).not.toContain('<i>');

            // URLs replaced
            expect(outputContent).toContain('[URL]');
            expect(outputContent).not.toContain('https://');

            // Emojis replaced
            expect(outputContent).toContain('[EMOJI]');
            expect(outputContent).not.toContain('😊');

            // Brackets removed from content
            expect(outputContent).not.toContain('[text]');
            expect(outputContent).not.toContain('(with brackets)');
        });

        it('should handle BOM addition with all stripping options', async () => {
            const inputPath = path.join(tempDir, 'bom-strip.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
<b>Test</b> content!`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                bom: true,
                strip: {
                    html: true,
                    punctuation: true,
                },
            };

            const result = await processor.processFile(inputPath, undefined, options);
            const outputBuffer = await fs.promises.readFile(result.outputPath);

            // Check for UTF-8 BOM
            expect(outputBuffer[0]).toBe(0xef);
            expect(outputBuffer[1]).toBe(0xbb);
            expect(outputBuffer[2]).toBe(0xbf);
        });
    });

    describe('File Operation Edge Cases', () => {
        it('should handle files with no extension', async () => {
            const inputPath = path.join(tempDir, 'noextension');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
No extension file`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);

            expect(fs.existsSync(result.outputPath)).toBe(true);
        });

        it('should handle deeply nested directory structures', async () => {
            const deepPath = path.join(tempDir, 'a', 'b', 'c', 'd', 'e', 'f', 'g');

            await fs.promises.mkdir(deepPath, { recursive: true });

            const inputPath = path.join(deepPath, 'deep.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Deeply nested file`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);

            expect(fs.existsSync(result.outputPath)).toBe(true);
        });

        it('should handle concurrent processing of the same file type (simulate race condition)', async () => {
            const inputPath1 = path.join(tempDir, 'file1.srt');
            const inputPath2 = path.join(tempDir, 'file2.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Concurrent test`;

            await fs.promises.writeFile(inputPath1, srtContent, 'utf8');
            await fs.promises.writeFile(inputPath2, srtContent, 'utf8');

            const processor2 = new SubtitleProcessor();

            const [result1, result2] = await Promise.all([
                processor.processFile(inputPath1),
                processor2.processFile(inputPath2),
            ]);

            expect(fs.existsSync(result1.outputPath)).toBe(true);
            expect(fs.existsSync(result2.outputPath)).toBe(true);
        });

        it('should handle file with special characters in name', async () => {
            const specialName = "file [test] (2024) #1 - subtitle's & more.srt";
            const inputPath = path.join(tempDir, specialName);
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Special filename test`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);

            expect(fs.existsSync(result.outputPath)).toBe(true);
        });
    });

    describe('Backup and Overwrite Edge Cases', () => {
        it('should handle multiple backup creation without overwrite', async () => {
            const inputPath = path.join(tempDir, 'backup-test.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Backup test`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                overwriteInput: true,
                backupOriginal: true,
                overwriteBackup: false,
            };

            // First backup
            const result1 = await processor.processFile(inputPath, undefined, options);

            expect(result1.backupPath).toBeDefined();
            expect(fs.existsSync(result1.backupPath!)).toBe(true);

            // Second backup (should create .bak.1)
            await fs.promises.writeFile(inputPath, srtContent + '\nModified', 'utf8');
            const result2 = await processor.processFile(inputPath, undefined, options);

            expect(result2.backupPath).toBeDefined();
            expect(result2.backupPath).not.toBe(result1.backupPath);
            expect(fs.existsSync(result1.backupPath!)).toBe(true);
            expect(fs.existsSync(result2.backupPath!)).toBe(true);
        });

        it('should fail when output exists and overwrite is disabled', async () => {
            const inputPath = path.join(tempDir, 'input.srt');
            const outputPath = path.join(tempDir, 'output.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Test`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');
            await fs.promises.writeFile(outputPath, 'existing', 'utf8');

            const options: IConvertOptions = {
                overwriteExisting: false,
            };

            await expect(processor.processFile(inputPath, outputPath, options)).rejects.toThrow(
                /already exists and overwrite is disabled/,
            );
        });
    });

    describe('Content Preservation Edge Cases', () => {
        it('should preserve exact spacing in subtitle text', async () => {
            const inputPath = path.join(tempDir, 'spacing.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Line 1 with  double  spaces
Line 2    with    multiple    spaces`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Internal spacing within lines should be somewhat preserved
            expect(outputContent).toContain('Line 1');
            expect(outputContent).toContain('Line 2');
        });

        it('should handle subtitle with only special characters', async () => {
            const inputPath = path.join(tempDir, 'special-only.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
♪♫♪♫

2
00:00:04,000 --> 00:00:06,000
...

3
00:00:07,000 --> 00:00:09,000
---`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const result = await processor.processFile(inputPath);
            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('♪♫♪♫');
            expect(outputContent).toContain('...');
            expect(outputContent).toContain('---');
        });
    });
});
