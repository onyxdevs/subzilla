import { SubtitleProcessor, ConfigManager } from '@subzilla/core';
import { IConvertCommandOptions } from '@subzilla/types/cli/options';
import { ICommandDefinition } from '@subzilla/types/cli/command';

import { CONVERT_OPTIONS } from '../constants/options';
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
            options: CONVERT_OPTIONS,
            action: async (inputFile: string, options: IConvertCommandOptions): Promise<void> => {
                try {
                    const config = options.loadedConfig || (await ConfigManager.loadConfig());
                    const outputOptions = {
                        strip: createStripOptions(options, config),
                        backupOriginal: options.backup ?? config.output?.createBackup,
                        overwriteBackup: options.overwriteBackup ?? config.output?.overwriteBackup,
                        bom: options.bom ?? config.output?.bom,
                        lineEndings: options.lineEndings ?? config.output?.lineEndings,
                        overwriteInput: options.overwriteInput ?? config.output?.overwriteInput,
                        overwriteExisting:
                            options.overwriteExisting ?? config.output?.overwriteExisting,
                        retryCount: options.retryCount
                            ? parseInt(options.retryCount, 10)
                            : config.batch?.retryCount,
                        retryDelay: options.retryDelay
                            ? parseInt(options.retryDelay, 10)
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
