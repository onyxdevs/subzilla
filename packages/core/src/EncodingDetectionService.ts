import fs from 'fs';

import { detect } from 'chardet';

export default class EncodingDetectionService {
    /**
     * Detect BOM (Byte Order Mark) in the buffer
     * @param data The buffer to check for BOM
     * @returns The encoding if BOM is detected, null otherwise
     */
    private static detectBOM(data: Buffer): string | null {
        if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
            return 'UTF-8';
        }

        if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) {
            return 'UTF-16LE';
        }

        if (data.length >= 2 && data[0] === 0xfe && data[1] === 0xff) {
            return 'UTF-16BE';
        }

        return null;
    }

    /**
     * Normalize encoding name to a standard format
     * @param encoding The detected encoding
     * @returns Normalized encoding name
     */
    private static normalizeEncoding(encoding: string | null): string {
        if (!encoding) {
            return 'UTF-8';
        }

        const normalized = encoding.toLowerCase().replace(/[-_\s]/g, '');

        // Map common encoding variations
        const encodingMap: Record<string, string> = {
            utf8: 'UTF-8',
            utf16le: 'UTF-16LE',
            utf16be: 'UTF-16BE',
            windows1252: 'windows-1252',
            windows1256: 'windows-1256',
            iso88591: 'ISO-8859-1',
            iso88596: 'ISO-8859-6',
            latin1: 'ISO-8859-1',
            ascii: 'UTF-8', // Treat ASCII as UTF-8 (compatible)
        };

        return encodingMap[normalized] || encoding;
    }

    public static detectEncoding(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, (err: NodeJS.ErrnoException | null, data: Buffer) => {
                if (err) {
                    return reject(err);
                }

                // First check for BOM
                const bomEncoding = this.detectBOM(data);

                if (bomEncoding) {
                    return resolve(bomEncoding);
                }

                // Use chardet for content-based detection
                const detected = detect(data);
                const normalized = this.normalizeEncoding(detected);

                resolve(normalized);
            });
        });
    }
}
