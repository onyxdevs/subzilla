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
        } catch (error) {
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
                overwriteInput: true, // Backup only created when overwriting input
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
                    emojis: true,
                },
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            expect(outputContent).toContain('Visit [URL] for episode 123! [EMOJI]');
            expect(outputContent).not.toContain('<font');
            expect(outputContent).not.toContain('https://');
            expect(outputContent).not.toContain('😊');
            // Numbers preserved as they're structural in SRT
            expect(outputContent).toContain('123');
            // Timestamps preserved
            expect(outputContent).toContain('00:00:01,000 --> 00:00:06,000');
        });

        it('should never strip timestamps or numbers even if requested (structural protection)', async () => {
            const inputPath = path.join(tempDir, 'input.srt');
            const srtContent = `1
00:00:01,000 --> 00:00:03,000
Episode 42 starts now

2
00:00:04,000 --> 00:00:06,000
The answer is 123`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                strip: {
                    timestamps: true, // Should be ignored
                    numbers: true, // Should be ignored
                },
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Timestamps must be preserved (structural)
            expect(outputContent).toContain('00:00:01,000 --> 00:00:03,000');
            expect(outputContent).toContain('00:00:04,000 --> 00:00:06,000');
            // Sequence numbers must be preserved (structural)
            expect(outputContent).toMatch(/^1\n/);
            expect(outputContent).toContain('\n2\n');
            // Content numbers preserved too
            expect(outputContent).toContain('42');
            expect(outputContent).toContain('123');
            // Should NOT have corrupted placeholders
            expect(outputContent).not.toContain('[TIMESTAMP]');
            expect(outputContent).not.toContain('TIMESTAMP');
        });

        it('should protect timestamps from punctuation stripping', async () => {
            const inputPath = path.join(tempDir, 'input.srt');
            const srtContent = `1
00:00:03,983 --> 00:00:21,077
Hello, world! How are you?

2
00:01:00,000 --> 00:01:05,500
Test (with) [brackets]`;

            await fs.promises.writeFile(inputPath, srtContent, 'utf8');

            const options: IConvertOptions = {
                strip: {
                    punctuation: true, // This should NOT affect timestamps
                    brackets: true,
                },
            };

            const result = await processor.processFile(inputPath, undefined, options);

            const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

            // Timestamps must remain intact with their colons, commas, and arrows
            expect(outputContent).toContain('00:00:03,983 --> 00:00:21,077');
            expect(outputContent).toContain('00:01:00,000 --> 00:01:05,500');
            // Should NOT have corrupted timestamps like "000003983  000021077"
            expect(outputContent).not.toContain('000003983');
            expect(outputContent).not.toContain('000021077');
            // Punctuation should be removed from content
            expect(outputContent).toContain('Hello world How are you');
            // Brackets should be removed from content
            expect(outputContent).toContain('with');
            expect(outputContent).not.toContain('[brackets]');
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

        describe('Adjacent HTML Tags - Integration Tests', () => {
            it('should preserve word spacing when stripping adjacent HTML tags in Arabic', async () => {
                const inputPath = path.join(tempDir, 'arabic-adjacent.srt');
                const srtContent = `1
00:00:01,000 --> 00:00:03,000
<b>مرحبا</b><i>بك</i>

2
00:00:04,000 --> 00:00:06,000
<font color="red">هذا</font><font color="blue">نص</font><font color="green">عربي</font>`;

                await fs.promises.writeFile(inputPath, srtContent, 'utf8');

                const options: IConvertOptions = {
                    strip: { html: true },
                };

                const result = await processor.processFile(inputPath, undefined, options);

                const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

                // Should have proper spacing between words
                expect(outputContent).toContain('مرحبا بك');
                expect(outputContent).not.toContain('مرحبابك');

                expect(outputContent).toContain('هذا نص عربي');
                expect(outputContent).not.toContain('هذانصعربي');
            });

            it('should preserve word spacing in multiline Arabic subtitles with adjacent tags', async () => {
                const inputPath = path.join(tempDir, 'arabic-multiline.srt');
                const srtContent = `1
00:00:01,000 --> 00:00:03,000
<b>مرحبا</b><i>بك</i><u>يا</u><s>صديقي</s>

2
00:00:04,000 --> 00:00:06,000
<font color="red">هذا</font><font color="blue">نص</font>
<font color="green">عربي</font><font color="yellow">جميل</font>

3
00:00:07,000 --> 00:00:09,000
Normal text with <b>bold</b> and <i>italic</i> mixed`;

                await fs.promises.writeFile(inputPath, srtContent, 'utf8');

                const options: IConvertOptions = {
                    strip: { html: true, colors: true, styles: true },
                };

                const result = await processor.processFile(inputPath, undefined, options);

                const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

                // First subtitle: all words on one line with spaces
                expect(outputContent).toContain('مرحبا بك يا صديقي');

                // Second subtitle: words split across lines but each line has proper spacing
                expect(outputContent).toContain('هذا نص');
                expect(outputContent).toContain('عربي جميل');

                // Third subtitle: English text with proper spacing
                expect(outputContent).toContain('Normal text with bold and italic mixed');
            });

            it('should handle complex nested and adjacent tags without losing word boundaries', async () => {
                const inputPath = path.join(tempDir, 'complex-arabic.srt');
                const srtContent = `1
00:00:01,000 --> 00:00:03,000
<font color="red"><b>مرحبا</b></font><font color="blue"><i>بك</i></font> <font color="green">يا</font><font color="yellow">صديقي</font>`;

                await fs.promises.writeFile(inputPath, srtContent, 'utf8');

                const options: IConvertOptions = {
                    strip: { html: true },
                };

                const result = await processor.processFile(inputPath, undefined, options);

                const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

                // Should maintain proper word boundaries
                expect(outputContent).toContain('مرحبا بك يا صديقي');

                // Verify we have exactly 4 words separated by spaces
                const lines = outputContent.split('\n');
                const textLine = lines.find((line) => line.includes('مرحبا'));

                expect(textLine).toBeDefined();
                expect(textLine!.split(' ')).toHaveLength(4);
            });

            it('should preserve spacing in mixed language content with adjacent tags', async () => {
                const inputPath = path.join(tempDir, 'mixed-language.srt');
                const srtContent = `1
00:00:01,000 --> 00:00:03,000
<b>Hello</b><i>مرحبا</i><u>World</u><s>عالم</s>

2
00:00:04,000 --> 00:00:06,000
<font color="red">English</font><font color="blue">and</font><font color="green">عربي</font><font color="yellow">mixed</font>`;

                await fs.promises.writeFile(inputPath, srtContent, 'utf8');

                const options: IConvertOptions = {
                    strip: { html: true },
                };

                const result = await processor.processFile(inputPath, undefined, options);

                const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

                // Mixed language should have proper spacing
                expect(outputContent).toContain('Hello مرحبا World عالم');
                expect(outputContent).toContain('English and عربي mixed');
            });

            it('should handle real-world subtitle scenario with many adjacent font tags', async () => {
                const inputPath = path.join(tempDir, 'real-world.srt');
                const srtContent = `1
00:00:01,000 --> 00:00:03,000
<font color="#FF0000">أنا</font><font color="#00FF00">أحب</font><font color="#0000FF">البرمجة</font>

2
00:00:04,000 --> 00:00:06,000
<font size="12" color="red">هذا</font><font size="14" color="blue">نص</font><font size="16" color="green">جميل</font>

3
00:00:07,000 --> 00:00:09,000
<b><font color="white">Bold</font></b><i><font color="yellow">and</font></i><u><font color="cyan">styled</font></u>`;

                await fs.promises.writeFile(inputPath, srtContent, 'utf8');

                const options: IConvertOptions = {
                    strip: { html: true },
                };

                const result = await processor.processFile(inputPath, undefined, options);

                const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

                // All subtitles should have proper word spacing
                expect(outputContent).toContain('أنا أحب البرمجة');
                expect(outputContent).toContain('هذا نص جميل');
                expect(outputContent).toContain('Bold and styled');

                // No concatenated words
                expect(outputContent).not.toContain('أناأحبالبرمجة');
                expect(outputContent).not.toContain('هذانصجميل');
                expect(outputContent).not.toContain('Boldandstyled');
            });

            it('should maintain proper line breaks and spacing in multiline subtitles', async () => {
                const inputPath = path.join(tempDir, 'multiline-spacing.srt');
                const srtContent = `1
00:00:01,000 --> 00:00:05,000
<font color="red">السطر</font><font color="blue">الأول</font>
<font color="green">السطر</font><font color="yellow">الثاني</font>
<font color="pink">السطر</font><font color="purple">الثالث</font>`;

                await fs.promises.writeFile(inputPath, srtContent, 'utf8');

                const options: IConvertOptions = {
                    strip: { html: true },
                };

                const result = await processor.processFile(inputPath, undefined, options);

                const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

                // Each line should have proper spacing
                expect(outputContent).toContain('السطر الأول');
                expect(outputContent).toContain('السطر الثاني');
                expect(outputContent).toContain('السطر الثالث');

                // Verify line breaks are preserved
                const lines = outputContent.split('\n');
                const textLines = lines.filter((line) => line.includes('السطر'));

                expect(textLines).toHaveLength(3);
            });

            it('should handle edge case of empty tags between content tags', async () => {
                const inputPath = path.join(tempDir, 'empty-tags.srt');
                const srtContent = `1
00:00:01,000 --> 00:00:03,000
<b>Word1</b><i></i><u>Word2</u><s></s><font>Word3</font>`;

                await fs.promises.writeFile(inputPath, srtContent, 'utf8');

                const options: IConvertOptions = {
                    strip: { html: true },
                };

                const result = await processor.processFile(inputPath, undefined, options);

                const outputContent = await fs.promises.readFile(result.outputPath, 'utf8');

                // Empty tags should not cause extra spacing
                expect(outputContent).toContain('Word1 Word2 Word3');

                // Should not have double spaces
                expect(outputContent).not.toContain('  ');
            });
        });
    });
});
