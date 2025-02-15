import { SubtitleProcessor, ConfigLoader } from '@subzilla/core';
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
                    const config = options.loadedConfig || (await ConfigLoader.loadConfig());
                    const stripOptions = createStripOptions(options, config);

                    const processor = new SubtitleProcessor();

                    await processor.processFile(inputFile, options.output, {
                        strip: stripOptions,
                        backupOriginal: options.backup || config.output?.createBackup || false,
                    });

                    console.log('✨ Conversion successful!');
                    console.log(`Input file: ${inputFile}`);

                    // Place the `.utf8` in the file name but before the extension, then add the extension
                    // Split the input file name into parts
                    const parts = inputFile.split('.');
                    const extension = parts.pop();
                    const fileName = parts.join('.');

                    // Create the new file name with `.utf8` before the extension
                    const outputFile = `${fileName}.utf8.${extension}`;

                    console.log(`Output file: ${outputFile}`);

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
}
