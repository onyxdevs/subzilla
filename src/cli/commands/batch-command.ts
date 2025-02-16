import { BatchProcessor, ConfigManager } from '@subzilla/core';
import { IBatchCommandOptions } from '@subzilla/types/cli/options';
import { ICommandDefinition } from '@subzilla/types/cli/command';

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
            options: [
                {
                    flags: '-o, --output-dir <dir>',
                    description: 'output directory for converted files',
                },
                {
                    flags: '-r, --recursive',
                    description: 'search for files recursively',
                },
                {
                    flags: '-p, --parallel',
                    description: 'process files in parallel',
                },
                {
                    flags: '-s, --skip-existing',
                    description: 'skip files that already have a UTF-8 version',
                },
                {
                    flags: '-d, --max-depth <depth>',
                    description: 'maximum directory depth for recursive search',
                },
                {
                    flags: '-i, --include-dirs <dirs...>',
                    description: 'only process files in these directories',
                },
                {
                    flags: '-x, --exclude-dirs <dirs...>',
                    description: 'exclude files in these directories',
                },
                {
                    flags: '--preserve-structure',
                    description: 'preserve directory structure in output',
                },
                {
                    flags: '-b, --backup',
                    description: 'create backup of original files',
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
            action: async (pattern: string, options: IBatchCommandOptions): Promise<void> => {
                try {
                    const config = options.loadedConfig || (await ConfigManager.loadConfig());
                    const stripOptions = createStripOptions(options, config);
                    const outputOptions = {
                        strip: stripOptions,
                        backupOriginal: options.backup ?? config.output?.createBackup,

                        bom: options.bom ?? config.output?.bom,
                        lineEndings: options.lineEndings ?? config.output?.lineEndings,
                        overwriteExisting: options.overwrite ?? config.output?.overwriteExisting,
                        retryCount: options.retryCount
                            ? parseInt(options.retryCount, 10)
                            : config.batch?.retryCount,
                        retryDelay: options.retryDelay
                            ? parseInt(options.retryDelay, 10)
                            : config.batch?.retryDelay,

                        outputDir: options.outputDir ?? config.output?.directory,
                        recursive: options.recursive ?? config.batch?.recursive,
                        parallel: options.parallel ?? config.batch?.parallel,
                        skipExisting: options.skipExisting ?? config.batch?.skipExisting,
                        maxDepth: options.maxDepth
                            ? parseInt(options.maxDepth, 10)
                            : config.batch?.maxDepth,
                        includeDirectories: options.includeDirs ?? config.batch?.includeDirectories,
                        excludeDirectories: options.excludeDirs ?? config.batch?.excludeDirectories,
                        preserveStructure:
                            options.preserveStructure ?? config.output?.preserveStructure,
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
