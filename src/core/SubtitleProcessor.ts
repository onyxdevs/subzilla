import * as fs from 'fs/promises';
import { EncodingDetectionService } from './EncodingDetectionService';
import { EncodingConversionService } from './EncodingConversionService';
import { FormattingStripper } from './FormattingStripper';
import { ISubtitleOptions } from '../types/common/options';

export class SubtitleProcessor {
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
                const backupPath = inputFilePath + '.bak';

                await fs.copyFile(inputFilePath, backupPath);
            }

            // 6. Determine output path
            const finalOutputPath = outputFilePath || this.getDefaultOutputPath(inputFilePath);

            // 7. Write file as UTF-8
            await fs.writeFile(finalOutputPath, utf8Content, { encoding: 'utf8' });
        } catch (error) {
            throw new Error(`Failed to process file: ${(error as Error).message}`);
        }
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
