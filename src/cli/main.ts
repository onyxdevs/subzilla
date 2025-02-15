#!/usr/bin/env node

import 'module-alias/register';
import { Command } from 'commander';
import fs from 'fs';

import { ConfigManager } from '@subzilla/core';

import { DefaultCommandRegistry } from './registry/command-registry';
import { ConvertCommandCreator } from './commands/convert-command';
import { BatchCommandCreator } from './commands/batch-command';
import { InitCommandCreator } from './commands/init-command';
import { InfoCommandCreator } from './commands/info-command';

const program = new Command();

program
    .name('subzilla')
    .description('Convert subtitle files to UTF-8 with proper language support')
    .version('1.0.0')
    .option('-c, --config <path>', 'path to config file')
    .hook('preAction', async (thisCommand) => {
        try {
            const configPath = thisCommand.opts().config;
            const config = await ConfigManager.loadConfig(configPath);

            if (configPath) {
                console.log('🔧 Using configuration:', configPath);
            } else {
                const defaultConfigFiles = ['.subzillarc', '.subzilla.yml', '.subzilla.yaml'];
                const foundConfig = defaultConfigFiles.find((file) => {
                    try {
                        fs.accessSync(file);

                        return true;
                    } catch {
                        return false;
                    }
                });

                if (foundConfig) {
                    console.log('🔧 Using configuration:', foundConfig);
                } else {
                    console.log('ℹ️  Using default configuration');
                }
            }

            thisCommand.setOptionValue('loadedConfig', config);
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
