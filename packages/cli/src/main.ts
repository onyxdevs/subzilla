#!/usr/bin/env node

import 'module-alias/register';
import { Command } from 'commander';

import { ConfigManager } from '@subzilla/core';

import { BatchCommandCreator } from './commands/batch-command';
import { ConvertCommandCreator } from './commands/convert-command';
import { InfoCommandCreator } from './commands/info-command';
import { InitCommandCreator } from './commands/init-command';
import DefaultCommandRegistry from './registry/command-registry';

const program = new Command();

program
    .name('subzilla')
    .description('Convert subtitle files to UTF-8 with proper language support')
    .version('1.0.0')
    .option('-c, --config <path>', 'path to config file')
    .hook('preAction', async (thisCommand) => {
        try {
            const configPath = thisCommand.opts().config;
            const result = await ConfigManager.loadConfig(configPath);

            if (result.source === 'file' && result.filePath) {
                console.log('🔧 Using configuration:', result.filePath);
            } else {
                console.log('ℹ️  Using default configuration');
            }

            thisCommand.setOptionValue('loadedConfig', result.config);
        } catch (error) {
            console.error('❌ Failed to load configuration:', (error as Error).message);
            process.exit(1);
        }
    });

// Create command registry
const registry = new DefaultCommandRegistry(program);

// Register commands
registry.registerCommands([
    new ConvertCommandCreator(),
    new BatchCommandCreator(),
    new InitCommandCreator(),
    new InfoCommandCreator(),
]);

program.parse();
