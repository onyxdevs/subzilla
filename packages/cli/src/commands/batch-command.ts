import { BatchProcessor, ConfigManager } from '@subzilla/core';
import { IBatchCommandOptions, ICommandDefinition } from '@subzilla/types';

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
                            overwriteBackup:
                                options.overwriteBackup ?? config.output?.overwriteBackup,
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
                        },

                        batch: {
                            outputDir: options.outputDir ?? config.output?.directory,
                            recursive: options.recursive ?? config.batch?.recursive ?? false,
                            parallel: options.parallel ?? config.batch?.parallel ?? false,
                            skipExisting:
                                options.skipExisting ?? config.batch?.skipExisting ?? false,
                            maxDepth: options.maxDepth
                                ? parseInt(options.maxDepth, 10)
                                : config.batch?.maxDepth,
                            includeDirectories:
                                options.includeDirs ?? config.batch?.includeDirectories,
                            excludeDirectories:
                                options.excludeDirs ?? config.batch?.excludeDirectories,
                            preserveStructure:
                                options.preserveStructure ??
                                config.batch?.preserveStructure ??
                                false,
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
