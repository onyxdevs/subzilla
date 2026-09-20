import fs from 'fs';
import { TextDecoder } from 'util';

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
            // Like browsers (WHATWG), decode ISO-8859-1/-9 with their Windows
            // supersets: bytes 0x80-0x9F are curly quotes/ellipsis there, but
            // invisible C1 control characters in the ISO tables.
            iso88591: 'windows-1252',
            iso88599: 'windows-1254',
            iso88596: 'ISO-8859-6',
            latin1: 'windows-1252',
            ascii: 'UTF-8', // Treat ASCII as UTF-8 (compatible)
        };

        return encodingMap[normalized] || encoding;
    }

    /**
     * Strict UTF-8 validation. A buffer with non-ASCII bytes that decodes
     * cleanly as UTF-8 is UTF-8 for all practical purposes — far more reliable
     * than any statistical guess.
     */
    private static isValidUtf8(data: Buffer): boolean {
        try {
            new TextDecoder('utf-8', { fatal: true }).decode(data);

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Reduce the buffer to its spoken-text payload for statistical detection.
     *
     * Cue numbers, timestamps and markup (<font ...>, {\an8}) are pure ASCII.
     * Left in, they drown out the real text: a windows-1256 Arabic file with a
     * <font> tag on every line is "detected" as ISO-8859-1 and comes out as
     * mojibake. Works on a latin1 view so every byte round-trips untouched;
     * only safe for ASCII-compatible encodings (UTF-16 is ruled out earlier).
     */
    private static extractTextSample(data: Buffer): Buffer {
        const sample = data
            .toString('latin1')
            .replace(/<\/?[a-zA-Z][^<>\r\n]{0,200}>/g, '')
            .replace(/\{\\[^{}\r\n]{0,200}\}/g, '')
            .replace(/^.*\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*-->.*$/gm, '')
            .replace(/^\s*\d+\s*$/gm, '');

        return Buffer.from(sample, 'latin1');
    }

    /**
     * chardet regularly mistakes short windows-1256 (Arabic) text for Hebrew.
     * The two are structurally distinguishable: Arabic letters in windows-1256
     * occupy 0xC0-0xDF heavily (alef alone is 0xC7), while in the Hebrew code
     * pages that range holds no letters at all (unassigned / niqqud).
     */
    private static looksLikeArabicNotHebrew(data: Buffer): boolean {
        let high = 0;
        let arabicRange = 0;

        for (const byte of data) {
            if (byte >= 0x80) {
                high++;

                if (byte >= 0xc0 && byte <= 0xdf) arabicRange++;
            }
        }

        return high > 0 && arabicRange / high > 0.2;
    }

    /**
     * UTF-16 without a BOM: ASCII-range characters (digits, timestamps, line
     * breaks — present in every subtitle file) leave a NUL in every other byte.
     */
    private static detectBomlessUtf16(data: Buffer): string | null {
        const length = Math.min(data.length, 4096) & ~1;

        if (length < 4) return null;

        let evenNulls = 0;
        let oddNulls = 0;

        for (let i = 0; i < length; i += 2) {
            if (data[i] === 0) evenNulls++;

            if (data[i + 1] === 0) oddNulls++;
        }

        const pairs = length / 2;

        if (oddNulls / pairs > 0.3 && evenNulls / pairs < 0.05) return 'UTF-16LE';

        if (evenNulls / pairs > 0.3 && oddNulls / pairs < 0.05) return 'UTF-16BE';

        return null;
    }

    public static detectEncodingFromBuffer(data: Buffer): string {
        const certain = this.detectBOM(data) ?? this.detectBomlessUtf16(data);

        if (certain) {
            return certain;
        }

        if (this.isValidUtf8(data)) {
            return 'UTF-8';
        }

        // Content-based detection on the text payload only
        const sample = this.extractTextSample(data);
        const detected = this.normalizeEncoding(detect(sample.length > 0 ? sample : data));

        if (/^(iso-8859-8(-i)?|windows-1255)$/i.test(detected) && this.looksLikeArabicNotHebrew(sample)) {
            return 'windows-1256';
        }

        return detected;
    }

    public static detectEncoding(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, (err: NodeJS.ErrnoException | null, data: Buffer) => {
                if (err) {
                    return reject(err);
                }

                resolve(this.detectEncodingFromBuffer(data));
            });
        });
    }
}
