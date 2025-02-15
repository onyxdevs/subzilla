import { SubtitleProcessor, ConfigManager } from '@subzilla/core';
import { IConvertCommandOptions } from '@subzilla/types/cli/options';
import { ICommandDefinition } from '@subzilla/types/cli/command';

import { createStripOptions } from '../utils/strip-options';
import { BaseCommandCreator } from './base-command';

export class ConvertCommandCreator extends BaseCommandCreator<IConvertCommandOptions> {
    protected getDefinition(): ICommandDefinition<IConvertCommandOptions> {
        return {
            name: 'convert',
            description: 'Convert a single subtitle file to UTF-8',
            arguments: [
                {
                    name: 'inputFile',
                    description: 'path to the input subtitle file',
                },
            ],
            options: [
                {
                    flags: '-o, --output <outputFile>',
                    description: 'path to save the converted file (optional)',
                },
                {
                    flags: '-b, --backup',
                    description: 'create backup of original file',
                    defaultValue: false,
                },
                {
                    flags: '--bom',
                    description: 'add UTF-8 BOM to output file',
                    defaultValue: true,
                },
                {
                    flags: '--line-endings <type>',
                    description: 'line endings type (lf, crlf, auto)',
                    defaultValue: 'auto',
                },
                {
                    flags: '--overwrite',
                    description: 'overwrite existing output file',
                    defaultValue: false,
                },
                {
                    flags: '--retry-count <number>',
                    description: 'number of retries on failure',
                    defaultValue: '3',
                },
                {
                    flags: '--retry-delay <ms>',
                    description: 'delay between retries in milliseconds',
                    defaultValue: '1000',
                },
                {
                    flags: '--buffer-size <bytes>',
                    description: 'buffer size for file operations',
                    defaultValue: '8192',
                },
                {
                    flags: '--streaming',
                    description: 'use streaming for large files',
                    defaultValue: false,
                },
                {
                    flags: '--strip-html',
                    description: 'strip HTML tags',
                    defaultValue: false,
                },
                {
                    flags: '--strip-colors',
                    description: 'strip color codes',
                    defaultValue: false,
                },
                {
                    flags: '--strip-styles',
                    description: 'strip style tags',
                    defaultValue: false,
                },
                {
                    flags: '--strip-urls',
                    description: 'replace URLs with [URL]',
                    defaultValue: false,
                },
                {
                    flags: '--strip-timestamps',
                    description: 'replace timestamps with [TIMESTAMP]',
                    defaultValue: false,
                },
                {
                    flags: '--strip-numbers',
                    description: 'replace numbers with #',
                    defaultValue: false,
                },
                {
                    flags: '--strip-punctuation',
                    description: 'remove punctuation',
                    defaultValue: false,
                },
                {
                    flags: '--strip-emojis',
                    description: 'replace emojis with [EMOJI]',
                    defaultValue: false,
                },
                {
                    flags: '--strip-brackets',
                    description: 'remove brackets',
                    defaultValue: false,
                },
                {
                    flags: '--strip-all',
                    description: 'strip all formatting (equivalent to all strip options)',
                    defaultValue: false,
                },
            ],
            action: async (inputFile: string, options: IConvertCommandOptions): Promise<void> => {
                try {
                    const config = options.loadedConfig || (await ConfigManager.loadConfig());
                    const stripOptions = createStripOptions(options, config);

                    const processor = new SubtitleProcessor();

                    await processor.processFile(inputFile, options.output, {
                        strip: stripOptions,
                        backupOriginal: options.backup || config.output?.createBackup || false,
                        bom: options.bom || config.output?.bom || true,
                        lineEndings: options.lineEndings || config.output?.lineEndings || 'auto',
                        overwriteExisting:
                            options.overwrite || config.output?.overwriteExisting || false,
                        useStreaming:
                            options.streaming || config.performance?.useStreaming || false,
                        bufferSize:
                            parseInt(options.bufferSize || '') ||
                            config.performance?.bufferSize ||
                            8192,
                        retryCount:
                            parseInt(options.retryCount || '') || config.batch?.retryCount || 3,
                        retryDelay:
                            parseInt(options.retryDelay || '') || config.batch?.retryDelay || 1000,
                    });

                    console.log('✨ Conversion successful!');
                    console.log(`Input file: ${inputFile}`);
                    console.log(
                        `Output file: ${options.output || this.getDefaultOutputPath(inputFile)}`
                    );

                    if (options.backup || config.output?.createBackup) {
                        console.log(`Backup file: ${inputFile}.bak`);
                    }
                } catch (error) {
                    console.error('❌ Error:', (error as Error).message);
                    process.exit(1);
                }
            },
        };
    }

    private getDefaultOutputPath(inputFile: string): string {
        const parts = inputFile.split('.');
        const extension = parts.pop();
        const fileName = parts.join('.');

        return `${fileName}.utf8.${extension}`;
    }
}
