import { BatchProcessor, ConfigManager } from '@subzilla/core';
import { IBatchCommandOptions } from '@subzilla/types/cli/options';
import { ICommandDefinition } from '@subzilla/types/cli/command';

import { BATCH_OPTIONS } from '../constants/options';
import { createStripOptions } from '../utils/strip-options';
import { BaseCommandCreator } from './base-command';

export class BatchCommandCreator extends BaseCommandCreator<IBatchCommandOptions> {
    protected getDefinition(): ICommandDefinition<IBatchCommandOptions> {
        return {
            name: 'batch',
            description: 'Convert multiple subtitle files to UTF-8',
            arguments: [
                {
                    name: 'pattern',
                    description: 'glob pattern for input files (e.g., "**/*.srt")',
                },
            ],
            options: BATCH_OPTIONS,
            action: async (pattern: string, options: IBatchCommandOptions): Promise<void> => {
                try {
                    const config = options.loadedConfig || (await ConfigManager.loadConfig());
                    const outputOptions = {
                        common: {
                            strip: createStripOptions(options, config),
                            backupOriginal: options.backup ?? config.output?.createBackup,
                            bom: options.bom ?? config.output?.bom,
                            lineEndings: options.lineEndings ?? config.output?.lineEndings,
                            overwriteExisting:
                                options.overwrite ?? config.output?.overwriteExisting,
                            retryCount: options.retryCount
                                ? parseInt(options.retryCount, 10)
                                : config.batch?.retryCount,
                            retryDelay: options.retryDelay
                                ? parseInt(options.retryDelay, 10)
                                : config.batch?.retryDelay,
                        },

                        batch: {
                            outputDir: options.outputDir ?? config.output?.directory,
                            recursive: options.recursive ?? config.batch?.recursive,
                            parallel: options.parallel ?? config.batch?.parallel,
                            skipExisting: options.skipExisting ?? config.batch?.skipExisting,
                            maxDepth: options.maxDepth
                                ? parseInt(options.maxDepth, 10)
                                : config.batch?.maxDepth,
                            includeDirectories:
                                options.includeDirs ?? config.batch?.includeDirectories,
                            excludeDirectories:
                                options.excludeDirs ?? config.batch?.excludeDirectories,
                            preserveStructure:
                                options.preserveStructure ?? config.batch?.preserveStructure,
                            chunkSize: options.chunkSize ?? config.batch?.chunkSize,
                        },
                    };

                    console.log('🧬 Output options:', outputOptions);

                    const batchProcessor = new BatchProcessor();

                    await batchProcessor.processBatch(pattern, outputOptions);
                } catch (error) {
                    console.error('❌ Error:', (error as Error).message);
                    process.exit(1);
                }
            },
        };
    }
}
