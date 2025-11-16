import { Buffer } from 'buffer';
import fs from 'fs/promises';

import { IConvertOptions } from '@subzilla/types';

import EncodingConversionService from './EncodingConversionService';
import EncodingDetectionService from './EncodingDetectionService';
import FormattingStripper from './FormattingStripper';
import OverwriteOutputStrategy from './utils/OverwriteOutputStrategy';
import SuffixOutputStrategy from './utils/SuffixOutputStrategy';

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
        options: IConvertOptions = {},
    ): Promise<{ outputPath: string; backupPath?: string }> {
        let backupPath: string | undefined;

        try {
            // Validate input file exists
            await fs.access(inputFilePath);

            // Determine output strategy
            const outputStrategy = options.overwriteInput ? new OverwriteOutputStrategy() : new SuffixOutputStrategy();

            // Determine final output path
            const finalOutputPath = outputFilePath || outputStrategy.getOutputPath(inputFilePath);

            // Check if we need to create a backup
            // Respect user's createBackup config even when overwriting input
            const shouldBackup = options.backupOriginal ?? outputStrategy.shouldBackup;

            if (shouldBackup) {
                backupPath = await this.createBackup(inputFilePath, options.overwriteBackup);
            }

            // Handle existing output file
            await this.handleExistingFile(finalOutputPath, options);

            // Process content
            const detectedEncoding = await EncodingDetectionService.detectEncoding(inputFilePath);
            const fileBuffer = await fs.readFile(inputFilePath);
            let utf8Content = EncodingConversionService.convertToUtf8(fileBuffer, detectedEncoding);

            // Strip any existing BOM to prevent double BOM when adding a new one
            if (utf8Content.charCodeAt(0) === 0xfeff) {
                utf8Content = utf8Content.slice(1);
            }

            if (options.strip) {
                // Prevent corrupting SRT file structure by never stripping timestamps or sequence numbers
                const safeStripOptions = {
                    ...options.strip,
                    timestamps: false, // NEVER strip timestamps - corrupts SRT structure
                    numbers: false, // NEVER strip numbers - corrupts SRT sequence numbers
                };

                utf8Content = this.formattingStripper.stripFormatting(utf8Content, safeStripOptions);
            }

            utf8Content = this.ensureProperLineBreaks(utf8Content);

            if (options.lineEndings) {
                utf8Content = this.normalizeLineEndings(utf8Content, options.lineEndings);
            }

            const finalContent = options.bom
                ? Buffer.concat([UTF8_BOM, Buffer.from(utf8Content, 'utf8')])
                : Buffer.from(utf8Content, 'utf8');

            // Write the processed content
            await fs.writeFile(finalOutputPath, finalContent);

            return {
                outputPath: finalOutputPath,
                backupPath,
            };
        } catch (error) {
            // If we created a backup but processing failed, try to restore it
            if (backupPath && options.overwriteInput) {
                try {
                    await fs.copyFile(backupPath, inputFilePath);
                    await fs.unlink(backupPath);
                } catch (restoreError) {
                    throw new Error(
                        `Processing failed and backup restoration failed. Original error: ${
                            (error as Error).message
                        }. Restore error: ${(restoreError as Error).message}`,
                    );
                }
            }

            throw new Error(`Failed to process file: ${(error as Error).message}`);
        }
    }

    private normalizeLineEndings(content: string, lineEnding: 'lf' | 'crlf' | 'auto'): string {
        return content.replace(/\r\n|\r|\n/g, LINE_ENDINGS[lineEnding]);
    }

    private async createBackup(filePath: string, overwriteBackup = true): Promise<string> {
        const backupPath = `${filePath}.bak`;

        if (overwriteBackup) {
            // Simply overwrite existing backup if it exists
            await fs.copyFile(filePath, backupPath);

            return backupPath;
        }

        // Legacy behavior: create numbered backups to avoid overwriting
        let finalBackupPath = backupPath;
        let counter = 1;

        // Handle case where backup file already exists
        let backupExists = true;

        while (backupExists) {
            try {
                await fs.access(finalBackupPath);
                finalBackupPath = `${backupPath}.${counter}`;
                counter++;
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                    backupExists = false;
                } else {
                    throw error;
                }
            }
        }

        await fs.copyFile(filePath, finalBackupPath);

        return finalBackupPath;
    }

    private async handleExistingFile(outputPath: string, options: IConvertOptions): Promise<void> {
        try {
            await fs.access(outputPath);

            if (!options.overwriteExisting) {
                throw new Error(`Output file ${outputPath} already exists and overwrite existing is disabled`);
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
        }
    }

    private ensureProperLineBreaks(content: string): string {
        const blocks = content.split(/\n\s*\n/);

        return blocks
            .map((block) => {
                const lines = block.split('\n');

                if (lines.length < 2) return block; // Skip invalid blocks

                // First line is the number
                // Second line is the timestamp
                // Rest are subtitle text that should be single-spaced
                const number = lines[0].trim();
                const timestamp = lines[1].trim();

                // Filter out empty lines and join subtitle text with a single line break
                // TV/Media players expect exactly one line break between subtitle lines
                const subtitleText = lines
                    .slice(2)
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0)
                    .join('\n');

                // Ensure proper spacing:
                // - One empty line between subtitle blocks (handled by join('\n\n') at the end)
                // - No empty lines within a subtitle block
                return `${number}\n${timestamp}\n${subtitleText}`;
            })
            .join('\n\n'); // Double line break between subtitle blocks is standard for SRT files
    }
}
