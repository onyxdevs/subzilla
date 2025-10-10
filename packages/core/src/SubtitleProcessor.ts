import { Buffer } from 'buffer';
import fs from 'fs/promises';

import { IConvertOptions, IStripOptions } from '@subzilla/types';

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

            // Handle existing output file - check before creating backup
            const outputExists = await this.checkFileExists(finalOutputPath);

            if (outputExists && !options.overwriteExisting && !options.overwriteInput) {
                throw new Error(`Output file ${finalOutputPath} already exists and overwrite is disabled`);
            }

            // Determine if we should create a backup
            // Only create backups when overwriting the original input file
            const shouldBackup = options.overwriteInput && (options.backupOriginal ?? false);

            if (shouldBackup) {
                backupPath = await this.createBackup(inputFilePath, options.overwriteBackup ?? false);
            }

            // Process content
            const detectedEncoding = await EncodingDetectionService.detectEncoding(inputFilePath);
            const fileBuffer = await fs.readFile(inputFilePath);
            let utf8Content = EncodingConversionService.convertToUtf8(fileBuffer, detectedEncoding);

            if (options.strip) {
                // Validate strip options for subtitle files
                const validatedOptions = this.validateStripOptions(options.strip);

                // Protect timestamps from being corrupted by other strippers (especially punctuation)
                const { content: protectedContent, timestamps } = this.protectTimestamps(utf8Content);

                // Apply stripping to protected content
                const strippedContent = this.formattingStripper.stripFormatting(protectedContent, validatedOptions);

                // Restore original timestamps
                utf8Content = this.restoreTimestamps(strippedContent, timestamps);
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

    private async checkFileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);

            return true;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return false;
            }
            throw error;
        }
    }

    private validateStripOptions(stripOptions: IStripOptions): IStripOptions {
        // Timestamps and numbers are structural elements in subtitle files
        // Stripping them corrupts the file format
        if (stripOptions.timestamps || stripOptions.numbers) {
            console.warn(
                '⚠️  Warning: Stripping timestamps or numbers from subtitle files will corrupt them. These options will be ignored.',
            );
        }

        return {
            ...stripOptions,
            timestamps: false, // Never strip timestamps - they're structural
            numbers: false, // Never strip numbers - sequence numbers are structural
        };
    }

    private protectTimestamps(content: string): { content: string; timestamps: string[] } {
        const timestamps: string[] = [];
        const timestampRegex = /\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/g;

        let index = 0;
        const protectedContent = content.replace(timestampRegex, (match) => {
            timestamps.push(match);

            // Use a placeholder that won't be affected by ANY stripping operations
            // Alphanumeric only, wrapped in a unique pattern
            return `XXTIMESTAMPXX${String(index++).padStart(6, '0')}XXTIMESTAMPXX`;
        });

        return { content: protectedContent, timestamps };
    }

    private restoreTimestamps(content: string, timestamps: string[]): string {
        let restoredContent = content;

        timestamps.forEach((timestamp, index) => {
            const placeholder = `XXTIMESTAMPXX${String(index).padStart(6, '0')}XXTIMESTAMPXX`;

            restoredContent = restoredContent.replace(placeholder, timestamp);
        });

        return restoredContent;
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
