import fs from 'fs/promises';
import { Buffer } from 'buffer';

import { ISubtitleOptions } from '@subzilla/types/common/options';
import EncodingDetectionService from './EncodingDetectionService';
import EncodingConversionService from './EncodingConversionService';
import FormattingStripper from './FormattingStripper';

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const LINE_ENDINGS = {
    lf: '\n',
    crlf: '\r\n',
    auto: process.platform === 'win32' ? '\r\n' : '\n',
};

export default class SubtitleProcessor {
    private formattingStripper: FormattingStripper;

    constructor() {
        this.formattingStripper = new FormattingStripper();
    }

    public async processFile(
        inputFilePath: string,
        outputFilePath?: string,
        options: ISubtitleOptions = {}
    ): Promise<void> {
        try {
            // 1. Detect encoding
            const detectedEncoding = await EncodingDetectionService.detectEncoding(inputFilePath);

            // 2. Read file as Buffer
            const fileBuffer = await fs.readFile(inputFilePath);

            // 3. Convert to UTF-8
            let utf8Content = EncodingConversionService.convertToUtf8(fileBuffer, detectedEncoding);

            // 4. Strip formatting if requested
            if (options.strip) {
                utf8Content = this.formattingStripper.stripFormatting(utf8Content, options.strip);
            }

            // 5. Create backup if requested
            if (options.backupOriginal) {
                const backupPath = `${inputFilePath}.bak`;

                await fs.copyFile(inputFilePath, backupPath);
            }

            // 6. Normalize line endings if specified
            if (options.lineEndings) {
                utf8Content = this.normalizeLineEndings(utf8Content, options.lineEndings);
            }

            // 7. Add BOM if requested
            const finalContent = options.bom
                ? Buffer.concat([UTF8_BOM, Buffer.from(utf8Content, 'utf8')])
                : Buffer.from(utf8Content, 'utf8');

            // 8. Check if file exists and handle overwrite
            const finalOutputPath = outputFilePath || this.getDefaultOutputPath(inputFilePath);

            if (!options.overwriteExisting) {
                try {
                    await fs.access(finalOutputPath);
                    throw new Error(
                        `Output file ${finalOutputPath} already exists and overwrite is disabled`
                    );
                } catch (error) {
                    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                        throw error;
                    }
                }
            }

            // 9. Write file
            await fs.writeFile(finalOutputPath, finalContent);
        } catch (error) {
            throw new Error(`Failed to process file: ${(error as Error).message}`);
        }
    }

    private normalizeLineEndings(content: string, lineEnding: 'lf' | 'crlf' | 'auto'): string {
        // First normalize to LF
        const normalized = content.replace(/\r\n|\r|\n/g, '\n');

        // Then convert to desired line ending
        return normalized.replace(/\n/g, LINE_ENDINGS[lineEnding]);
    }

    private getDefaultOutputPath(inputFilePath: string): string {
        // Example: 'example.srt' -> 'example.utf8.srt'
        const dotIndex = inputFilePath.lastIndexOf('.');

        if (dotIndex === -1) {
            return `${inputFilePath}.utf8`;
        }

        const baseName = inputFilePath.substring(0, dotIndex);
        const extension = inputFilePath.substring(dotIndex);

        return `${baseName}.utf8${extension}`;
    }
}
