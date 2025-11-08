import { describe, it, expect } from '@jest/globals';

import EncodingConversionService from '../src/EncodingConversionService';

describe('EncodingConversionService', () => {
    describe('convertToUtf8', () => {
        it('should convert UTF-8 buffer to UTF-8 string', () => {
            const content = 'Hello World';
            const buffer = Buffer.from(content, 'utf8');

            const result = EncodingConversionService.convertToUtf8(buffer, 'utf8');

            expect(result).toBe(content);
        });

        it('should convert ASCII buffer to UTF-8 string', () => {
            const content = 'Hello World';
            const buffer = Buffer.from(content, 'ascii');

            const result = EncodingConversionService.convertToUtf8(buffer, 'ascii');

            expect(result).toBe(content);
        });

        it('should convert Latin-1 buffer to UTF-8 string', () => {
            const content = 'Café résumé';
            const buffer = Buffer.from(content, 'latin1');

            const result = EncodingConversionService.convertToUtf8(buffer, 'latin1');

            expect(result).toBe(content);
        });

        it('should handle Arabic text conversion', () => {
            const arabicText = 'مرحبا بالعالم';
            const buffer = Buffer.from(arabicText, 'utf8');

            const result = EncodingConversionService.convertToUtf8(buffer, 'utf8');

            expect(result).toBe(arabicText);
        });

        it('should handle empty buffer', () => {
            const buffer = Buffer.alloc(0);

            const result = EncodingConversionService.convertToUtf8(buffer, 'utf8');

            expect(result).toBe('');
        });

        it('should handle Windows-1252 encoding', () => {
            // Create buffer with Windows-1252 specific characters
            const buffer = Buffer.from([
                0x53, 0x6d, 0x61, 0x72, 0x74, 0x20, 0x71, 0x75, 0x6f, 0x74, 0x65, 0x73, 0x3a, 0x20, 0x93, 0x48, 0x65,
                0x6c, 0x6c, 0x6f, 0x94,
            ]);

            const result = EncodingConversionService.convertToUtf8(buffer, 'windows-1252');

            expect(result).toContain('Smart quotes:');
            expect(result).toContain('Hello');
        });

        it('should throw error for invalid encoding names', () => {
            const content = 'Hello World';
            const buffer = Buffer.from(content, 'utf8');

            // iconv-lite throws for unknown encodings
            expect(() => {
                EncodingConversionService.convertToUtf8(buffer, 'invalid-encoding');
            }).toThrow('Encoding not recognized');
        });

        it('should handle binary data gracefully', () => {
            const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe]);

            const result = EncodingConversionService.convertToUtf8(buffer, 'utf8');

            expect(typeof result).toBe('string');
            expect(result).toBeDefined();
        });

        it('should preserve line endings during conversion', () => {
            const content = 'Line 1\r\nLine 2\nLine 3\r';
            const buffer = Buffer.from(content, 'utf8');

            const result = EncodingConversionService.convertToUtf8(buffer, 'utf8');

            expect(result).toBe(content);
            expect(result).toContain('\r\n');
            expect(result).toContain('\n');
            expect(result).toContain('\r');
        });
    });
});
