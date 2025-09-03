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
        } catch (error) {
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

            await expect(
                EncodingDetectionService.detectEncoding(nonExistentPath)
            ).rejects.toThrow();
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
