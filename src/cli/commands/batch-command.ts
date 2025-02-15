import { BatchProcessor, ConfigLoader } from '@subzilla/core';
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
                    defaultValue: false,
                },
                {
                    flags: '-p, --parallel',
                    description: 'process files in parallel',
                    defaultValue: false,
                },
                {
                    flags: '-s, --skip-existing',
                    description: 'skip files that already have a UTF-8 version',
                    defaultValue: false,
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
                    defaultValue: false,
                },
                {
                    flags: '-b, --backup',
                    description: 'create backup of original files',
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
            action: async (pattern: string, options: IBatchCommandOptions): Promise<void> => {
                try {
                    const config = options.loadedConfig || (await ConfigLoader.loadConfig());
                    const stripOptions = createStripOptions(options, config);

                    const batchProcessor = new BatchProcessor();

                    await batchProcessor.processBatch(pattern, {
                        outputDir: options.outputDir || config.output?.directory,
                        recursive: options.recursive || config.batch?.recursive || false,
                        parallel: options.parallel || config.batch?.parallel || false,
                        skipExisting: options.skipExisting || config.batch?.skipExisting || false,
                        maxDepth: options.maxDepth
                            ? parseInt(options.maxDepth, 10)
                            : config.batch?.maxDepth,
                        includeDirectories: options.includeDirs || config.batch?.includeDirectories,
                        excludeDirectories: options.excludeDirs || config.batch?.excludeDirectories,
                        preserveStructure:
                            options.preserveStructure || config.output?.preserveStructure || false,
                        strip: stripOptions,
                        backupOriginal: options.backup || config.output?.createBackup || false,
                    });
                } catch (error) {
                    console.error('❌ Error:', (error as Error).message);
                    process.exit(1);
                }
            },
        };
    }
}
