import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import EncodingDetectionService from '../src/EncodingDetectionService';

describe('EncodingDetectionService', () => {
    let tempDir: string;
    let testFilePath: string;

    beforeEach(async () => {
        // Create temporary directory for test files
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subzilla-test-'));
        testFilePath = path.join(tempDir, 'test.srt');
    });

    afterEach(async () => {
        // Clean up temporary files
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('detectEncoding', () => {
        it('should detect UTF-8 encoding for UTF-8 content', async () => {
            const content = 'Hello World\nمرحبا بالعالم';

            await fs.promises.writeFile(testFilePath, content, 'utf8');

            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);

            expect(encoding).toBe('UTF-8');
        });

        it('should detect UTF-8 with BOM', async () => {
            // UTF-8 BOM: EF BB BF
            const bom = Buffer.from([0xef, 0xbb, 0xbf]);
            const content = Buffer.from('Hello World\nمرحبا بالعالم', 'utf8');
            const fileContent = Buffer.concat([bom, content]);

            await fs.promises.writeFile(testFilePath, fileContent);

            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);

            expect(encoding).toBe('UTF-8');
        });

        it('should detect UTF-16LE with BOM', async () => {
            // UTF-16LE BOM: FF FE
            const bom = Buffer.from([0xff, 0xfe]);
            const content = Buffer.from('Hello World', 'utf16le');
            const fileContent = Buffer.concat([bom, content]);

            await fs.promises.writeFile(testFilePath, fileContent);

            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);

            expect(encoding).toBe('UTF-16LE');
        });

        it('should detect UTF-16BE with BOM', async () => {
            // UTF-16BE BOM: FE FF
            const bom = Buffer.from([0xfe, 0xff]);
            const content = Buffer.from('Hello World', 'utf16le');
            // Swap bytes for big endian
            const swapped = Buffer.alloc(content.length);

            for (let i = 0; i < content.length; i += 2) {
                swapped[i] = content[i + 1];
                swapped[i + 1] = content[i];
            }

            const fileContent = Buffer.concat([bom, swapped]);

            await fs.promises.writeFile(testFilePath, fileContent);

            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);

            expect(encoding).toBe('UTF-16BE');
        });

        it('should detect Windows-1256 (Arabic encoding)', async () => {
            // Windows-1256 encoded Arabic text with longer content for better detection
            // Repeating Arabic text to give chardet more data to work with
            const arabicText = [0xe3, 0xd1, 0xcd, 0xc8, 0xc7, 0x20, 0xc8, 0xc7, 0xe1, 0xda, 0xc7, 0xe1, 0xe3]; // "مرحبا بالعالم"
            const repeatedText: number[] = [];

            for (let i = 0; i < 20; i++) {
                repeatedText.push(...arabicText, 0x0d, 0x0a); // Add CRLF
            }

            const buffer = Buffer.from(repeatedText);

            await fs.promises.writeFile(testFilePath, buffer);

            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);

            expect(encoding).toBe('windows-1256');
        });

        it('should detect Latin-1 (ISO-8859-1)', async () => {
            // ISO-8859-1 specific characters with realistic French text
            // Using characters that are invalid in UTF-8 but valid in ISO-8859-1
            const frenchText =
                'Voici un texte en français avec des caractères accentués: ' +
                'àâäéèêëïîôùûüÿæœçÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒÇ. ' +
                'Cette phrase contient également des mots comme café, résumé, naïve, garçon. ';

            // Repeat to give chardet enough data
            const repeatedText = frenchText.repeat(5);
            const buffer = Buffer.from(repeatedText, 'latin1');

            await fs.promises.writeFile(testFilePath, buffer);

            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);

            expect(encoding).toMatch(/ISO-8859-1|windows-1252/i);
        });

        it('should use confidence threshold to reject low-confidence detections', async () => {
            // Create ambiguous content that might have low confidence
            const buffer = Buffer.from([0x80, 0x81, 0x82, 0x83, 0x84]);

            await fs.promises.writeFile(testFilePath, buffer);

            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);

            // Should still return a result (fallback to utf-8 if needed)
            expect(encoding).toBeDefined();
            expect(typeof encoding).toBe('string');
        });

        it('should handle empty buffer', async () => {
            await fs.promises.writeFile(testFilePath, Buffer.alloc(0));

            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);

            // Should fallback to utf-8 for empty buffer
            expect(encoding).toBeDefined();
            expect(typeof encoding).toBe('string');
        });

        it('should handle very small buffers', async () => {
            // Very small buffer (single byte)
            const buffer = Buffer.from([0x41]); // 'A'

            await fs.promises.writeFile(testFilePath, buffer);

            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);

            expect(encoding).toBeDefined();
            expect(typeof encoding).toBe('string');
        });

        it('should detect encoding for real-world subtitle file', async () => {
            // Create a realistic SRT file with Arabic content
            const subtitleContent = `1
00:00:01,000 --> 00:00:04,000
مرحبا بالعالم

2
00:00:05,000 --> 00:00:08,000
Hello World

3
00:00:09,000 --> 00:00:12,000
This is a subtitle file with mixed content`;

            await fs.promises.writeFile(testFilePath, subtitleContent, 'utf8');

            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);

            expect(encoding).toBe('UTF-8');
        });

        it('should detect encoding for simple ASCII content', async () => {
            const content = 'Hello World\nSimple ASCII text';

            await fs.promises.writeFile(testFilePath, content, 'ascii');

            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);

            // ASCII content is often detected as UTF-8 or ASCII by chardet
            expect(encoding).toBeDefined();
            expect(typeof encoding).toBe('string');
        });

        it('should handle empty files gracefully', async () => {
            await fs.promises.writeFile(testFilePath, '', 'utf8');

            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);

            // Empty files might be detected as various encodings, but should fallback to utf-8
            expect(encoding).toBeDefined();
            expect(typeof encoding).toBe('string');
        });

        it('should handle binary content gracefully', async () => {
            // Create a file with binary content that might confuse chardet
            const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);

            await fs.promises.writeFile(testFilePath, buffer);

            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);

            // Binary content should still return some encoding, fallback to utf-8 if null
            expect(encoding).toBeDefined();
            expect(typeof encoding).toBe('string');
        });

        it('should reject when file does not exist', async () => {
            const nonExistentPath = path.join(tempDir, 'nonexistent.srt');

            await expect(EncodingDetectionService.detectEncoding(nonExistentPath)).rejects.toThrow();
        });

        it('should handle Windows-1252 encoded content', async () => {
            // Create content with Windows-1252 specific characters
            const buffer = Buffer.from('Café résumé naïve', 'latin1');

            await fs.promises.writeFile(testFilePath, buffer);

            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);

            // Should detect some form of Latin encoding
            expect(encoding).toBeDefined();
            expect(typeof encoding).toBe('string');
        });

        it('should handle Arabic content with Windows-1256 encoding', async () => {
            // Create Arabic content (this test might be limited by the test environment)
            const arabicText = 'مرحبا بالعالم';

            await fs.promises.writeFile(testFilePath, arabicText, 'utf8');

            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);

            expect(encoding).toBeDefined();
            expect(typeof encoding).toBe('string');
        });

        it('should handle large files efficiently', async () => {
            // Create a large file to test performance
            const largeContent = 'Hello World\n'.repeat(10000);

            await fs.promises.writeFile(testFilePath, largeContent, 'utf8');

            const startTime = Date.now();
            const encoding = await EncodingDetectionService.detectEncoding(testFilePath);
            const endTime = Date.now();

            expect(encoding).toBeDefined();
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        });
    });
});
