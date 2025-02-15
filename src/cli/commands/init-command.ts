import { ConfigManager } from '@subzilla/core';
import { ICommandDefinition } from '@subzilla/types/cli/command';

import { BaseCommandCreator } from './base-command';

export class InitCommandCreator extends BaseCommandCreator {
    protected getDefinition(): ICommandDefinition {
        return {
            name: 'init',
            description: 'Create a default configuration file',
            arguments: [
                {
                    name: 'path',
                    description: 'path to create the config file',
                    defaultValue: '.subzillarc',
                },
            ],

            action: async (path: string): Promise<void> => {
                try {
                    await ConfigManager.createDefaultConfig(path);
                    console.log(`✨ Created default config file at: ${path}`);
                } catch (error) {
                    console.error('❌ Error:', (error as Error).message);
                    process.exit(1);
                }
            },
        };
    }
}
