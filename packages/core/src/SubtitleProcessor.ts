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

    // Regex to detect corrupted timestamps (punctuation stripped)
    // Matches patterns like "000000039  000035039" which was "00:00:00,039 --> 00:00:35,039"
    private corruptedTimestampRegex = /^(\d{9})\s+(\d{9})$/;

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
            const fileBuffer = await fs.readFile(inputFilePath);
            const detectedEncoding = EncodingDetectionService.detectEncodingFromBuffer(fileBuffer);
            let utf8Content = EncodingConversionService.convertToUtf8(fileBuffer, detectedEncoding);

            // Strip any existing BOM to prevent double BOM when adding a new one
            if (utf8Content.charCodeAt(0) === 0xfeff) {
                utf8Content = utf8Content.slice(1);
            }

            // Auto-recover corrupted timestamps (from previous punctuation stripping bug)
            // This fixes files where "00:00:00,039 --> 00:00:35,039" became "000000039  000035039"
            if (this.hasCorruptedTimestamps(utf8Content)) {
                console.log('⚠️ Detected corrupted timestamps, attempting recovery...');
                utf8Content = this.recoverCorruptedTimestamps(utf8Content);
            }

            // Never let a strip option destroy the SRT structure itself
            const safeStripOptions = options.strip && {
                ...options.strip,
                timestamps: false, // NEVER strip timestamps - corrupts SRT structure
                numbers: false, // NEVER strip numbers - corrupts SRT sequence numbers
                punctuation: false, // NEVER strip punctuation - removes : , --> from timestamps
                brackets: false, // NEVER strip brackets - could affect subtitle structure
            };

            utf8Content = this.processCues(utf8Content, safeStripOptions);

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

    /**
     * Clean the subtitle text one cue at a time.
     *
     * The file is split into cues on its ORIGINAL blank lines first; only then
     * is each cue transformed (break markers -> newlines, formatting stripped)
     * and its emptied lines dropped. Doing it in this order is what makes the
     * pipeline safe: a blank line inside a cue ends the cue for every SRT
     * reader, silently hiding the rest of its text — and stripping is very good
     * at producing blank lines ("<i>" alone on a line, "<br>" next to a real
     * newline, a line holding only "{\\an8}"). Since cue boundaries are fixed
     * before anything is removed, no transformation can invent a new one.
     */
    private processCues(content: string, strip?: IStripOptions): string {
        // ASS also has \n (soft break) and \h (hard space). Lowercase is
        // ambiguous with plain text ("C:\new"), so only trust it when the file
        // clearly carries ASS markup somewhere.
        const hasAssMarkup = /\\N|\{\\[a-zA-Z]/.test(content);

        const cues = content
            .replace(/\r\n|\r/g, '\n')
            .trim()
            .split(/\n\s*\n/)
            .map((block) => {
                let cue = this.normalizeHardLineBreaks(block, hasAssMarkup);

                if (strip) {
                    cue = this.formattingStripper.stripFormatting(cue, strip);
                }

                return this.formatCue(cue);
            })
            .join('\n\n'); // Double line break between subtitle blocks is standard for SRT files

        // Text files end with a newline; some players drop a last cue that doesn't
        return cues.length > 0 ? `${cues}\n` : cues;
    }

    /**
     * Convert inline hard line-break markers into real newlines.
     *
     * Subtitle sources often encode a line break inside a single physical line
     * using HTML <br> (any case / self-closing), the ASS/SSA forced break \N, or
     * an exotic Unicode/control line break (NEL, VT, FF, LS, PS) that players
     * render as nothing at all. If those are simply deleted or ignored, the
     * words on either side collapse together — very visible in Arabic/RTL where
     * two words read as one. Any empty line this leaves behind is dropped by
     * formatCue(), so a marker can never split a cue.
     */
    private normalizeHardLineBreaks(cue: string, hasAssMarkup: boolean): string {
        if (hasAssMarkup) {
            // Both are a word separator on screen: printing them verbatim or
            // dropping them makes the neighbouring words touch.
            cue = cue.replace(/[^\S\n]*(?:\\[nh])+[^\S\n]*/g, ' ');
        }

        return cue.replace(/[^\S\n]*(?:<[bB][rR]\s*\/?>|\\N|[\v\f\u0085\u2028\u2029])[^\S\n]*/g, '\n');
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

    private formatCue(block: string): string {
        const lines = block.split('\n');

        if (lines.length < 2) return block; // Skip invalid blocks

        // First line is the number
        // Second line is the timestamp
        // Rest are subtitle text that should be single-spaced
        const number = lines[0].trim();
        const timestamp = lines[1].trim();

        // Filter out empty lines and join subtitle text with a single line break
        // TV/Media players expect exactly one line break between subtitle lines,
        // and no empty lines within a subtitle block
        const subtitleText = lines
            .slice(2)
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .join('\n');

        return `${number}\n${timestamp}\n${subtitleText}`;
    }

    /**
     * Detect if the content has corrupted timestamps (from punctuation stripping)
     * Corrupted format: "000000039  000035039" instead of "00:00:00,039 --> 00:00:35,039"
     */
    private hasCorruptedTimestamps(content: string): boolean {
        const lines = content.split(/\r?\n/);

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip empty lines and subtitle text
            if (!trimmed || /^\d+$/.test(trimmed)) continue;

            // Check if this looks like a corrupted timestamp
            if (this.corruptedTimestampRegex.test(trimmed)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Recover corrupted timestamps in SRT content
     * Converts "000000039  000035039" back to "00:00:00,039 --> 00:00:35,039"
     */
    private recoverCorruptedTimestamps(content: string): string {
        const lines = content.split(/\r?\n/);
        let recoveredCount = 0;

        const recoveredLines = lines.map((line) => {
            const trimmed = line.trim();
            const match = trimmed.match(this.corruptedTimestampRegex);

            if (match) {
                const [, startRaw, endRaw] = match;
                const startTimestamp = this.parseCorruptedTimestamp(startRaw);
                const endTimestamp = this.parseCorruptedTimestamp(endRaw);

                if (startTimestamp && endTimestamp) {
                    recoveredCount++;

                    return `${startTimestamp} --> ${endTimestamp}`;
                }
            }

            return line;
        });

        if (recoveredCount > 0) {
            console.log(`🔧 Recovered ${recoveredCount} corrupted timestamps`);
        }

        return recoveredLines.join('\n');
    }

    /**
     * Parse a 9-digit corrupted timestamp back to SRT format
     * "000000039" -> "00:00:00,039"
     */
    private parseCorruptedTimestamp(raw: string): string | null {
        if (raw.length !== 9) return null;

        // Format: HHMMSSMMM (hours, minutes, seconds, milliseconds)
        const hours = raw.substring(0, 2);
        const minutes = raw.substring(2, 4);
        const seconds = raw.substring(4, 6);
        const millis = raw.substring(6, 9);

        // Validate ranges
        const h = parseInt(hours, 10);
        const m = parseInt(minutes, 10);
        const s = parseInt(seconds, 10);
        const ms = parseInt(millis, 10);

        if (h > 99 || m > 59 || s > 59 || ms > 999) {
            return null;
        }

        return `${hours}:${minutes}:${seconds},${millis}`;
    }
}
