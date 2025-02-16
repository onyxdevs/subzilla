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
                },
                {
                    flags: '--bom',
                    description: 'add UTF-8 BOM to output file',
                },
                {
                    flags: '--line-endings <type>',
                    description: 'line endings type (lf, crlf, auto)',
                },
                {
                    flags: '--overwrite',
                    description: 'overwrite existing output file',
                },
                {
                    flags: '--retry-count <number>',
                    description: 'number of retries on failure',
                },
                {
                    flags: '--retry-delay <ms>',
                    description: 'delay between retries in milliseconds',
                },
                {
                    flags: '--buffer-size <bytes>',
                    description: 'buffer size for file operations',
                },
                {
                    flags: '--streaming',
                    description: 'use streaming for large files',
                },
                {
                    flags: '--strip-html',
                    description: 'strip HTML tags',
                },
                {
                    flags: '--strip-colors',
                    description: 'strip color codes',
                },
                {
                    flags: '--strip-styles',
                    description: 'strip style tags',
                },
                {
                    flags: '--strip-urls',
                    description: 'replace URLs with [URL]',
                },
                {
                    flags: '--strip-timestamps',
                    description: 'replace timestamps with [TIMESTAMP]',
                },
                {
                    flags: '--strip-numbers',
                    description: 'replace numbers with #',
                },
                {
                    flags: '--strip-punctuation',
                    description: 'remove punctuation',
                },
                {
                    flags: '--strip-emojis',
                    description: 'replace emojis with [EMOJI]',
                },
                {
                    flags: '--strip-brackets',
                    description: 'remove brackets',
                },
                {
                    flags: '--strip-all',
                    description: 'strip all formatting (equivalent to all strip options)',
                },
            ],
            action: async (inputFile: string, options: IConvertCommandOptions): Promise<void> => {
                try {
                    const config = options.loadedConfig || (await ConfigManager.loadConfig());
                    const stripOptions = createStripOptions(options, config);
                    const outputOptions = {
                        strip: stripOptions,
                        backupOriginal: options.backup ?? config.output?.createBackup,
                        bom: options.bom ?? config.output?.bom,
                        lineEndings: options.lineEndings ?? config.output?.lineEndings,
                        overwriteExisting: options.overwrite ?? config.output?.overwriteExisting,
                        useStreaming: options.streaming ?? config.performance?.useStreaming,
                        bufferSize: options.bufferSize
                            ? parseInt(options.bufferSize)
                            : config.performance?.bufferSize,
                        retryCount: options.retryCount
                            ? parseInt(options.retryCount)
                            : config.batch?.retryCount,
                        retryDelay: options.retryDelay
                            ? parseInt(options.retryDelay)
                            : config.batch?.retryDelay,
                    };

                    console.log('🧬 Output options:', outputOptions);

                    const processor = new SubtitleProcessor();

                    await processor.processFile(inputFile, options.output, outputOptions);

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

        return `${fileName}.subzilla.${extension}`;
    }
}
