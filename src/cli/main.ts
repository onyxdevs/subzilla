#!/usr/bin/env node

import 'module-alias/register';
import { Command } from 'commander';

import { ConfigLoader } from '@subzilla/core';

import { DefaultCommandRegistry } from './registry/command-registry';
import { ConvertCommandCreator } from './commands/convert-command';
import { BatchCommandCreator } from './commands/batch-command';
import { InitCommandCreator } from './commands/init-command';

const program = new Command();

program
    .name('subzilla')
    .description('Convert subtitle files to UTF-8 with proper language support')
    .version('1.0.0')
    .option('-c, --config <path>', 'path to config file')
    .hook('preAction', async thisCommand => {
        const configPath = thisCommand.opts().config;
        const config = await ConfigLoader.loadConfig(configPath);

        thisCommand.setOptionValue('loadedConfig', config);
    });

// Create command registry
const registry = new DefaultCommandRegistry(program);

// Register commands
registry.registerCommands([
    new ConvertCommandCreator(),
    new BatchCommandCreator(),
    new InitCommandCreator(),
]);

program.parse();
