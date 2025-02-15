import chalk from 'chalk';
import fs from 'fs/promises';
import { Buffer } from 'buffer';

import { IInfoCommandOptions } from '@subzilla/types/cli/options';
import { ICommandDefinition } from '@subzilla/types/cli/command';

import { BaseCommandCreator } from './base-command';

import EncodingDetectionService from '../../core/EncodingDetectionService';

export class InfoCommandCreator extends BaseCommandCreator<IInfoCommandOptions> {
    protected getDefinition(): ICommandDefinition<IInfoCommandOptions> {
        return {
            name: 'info',
            description: 'Show detailed information about a subtitle file',
            arguments: [
                {
                    name: 'inputFile',
                    description: 'path to the subtitle file',
                },
            ],
            options: [], // No special options needed for now
            action: async (inputFile: string): Promise<void> => {
                try {
                    // Get file stats
                    const stats = await fs.stat(inputFile);

                    // Read file as buffer for analysis
                    const fileBuffer = await fs.readFile(inputFile);

                    // Detect encoding
                    const detectedEncoding =
                        await EncodingDetectionService.detectEncoding(inputFile);

                    // Check for BOM
                    const hasBOM = fileBuffer.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]));

                    // Count lines and entries
                    const content = fileBuffer.toString(detectedEncoding as NodeJS.BufferEncoding);
                    const lines = content.split(/\r?\n/);
                    const entries = content
                        .split(/\r?\n\r?\n/)
                        .filter((entry) => entry.trim()).length;

                    // Detect line endings
                    const hasCarriageReturn = content.includes('\r\n');
                    const lineEnding = hasCarriageReturn ? 'CRLF' : 'LF';

                    // Log the information
                    console.log('\n📄 ' + chalk.bold('SRT File Information') + '\n');

                    console.log('📝 ' + chalk.bold('Basic Information'));
                    console.log(`   • File: ${chalk.cyan(inputFile)}`);
                    console.log(`   • Size: ${chalk.yellow(this.formatFileSize(stats.size))}`);
                    console.log(`   • Modified: ${chalk.yellow(stats.mtime.toLocaleString())}`);

                    console.log('\n🔤 ' + chalk.bold('Encoding Information'));
                    console.log(`   • Detected Encoding: ${chalk.green(detectedEncoding)}`);
                    console.log(`   • BOM: ${hasBOM ? chalk.green('Yes') : chalk.red('No')}`);
                    console.log(`   • Line Endings: ${chalk.blue(lineEnding)}`);

                    console.log('\n📊 ' + chalk.bold('Content Statistics'));
                    console.log(`   • Total Lines: ${chalk.yellow(lines.length)}`);
                    console.log(`   • Subtitle Entries: ${chalk.yellow(entries)}`);
                } catch (error) {
                    console.error(
                        chalk.red('❌ Error analyzing subtitle file:'),
                        (error as Error).message
                    );
                    process.exit(1);
                }
            },
        };
    }

    private formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
}
