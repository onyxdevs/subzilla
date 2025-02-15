import { Command } from 'commander';
import { ISubtitleConfig } from '../core/config';
import { IConvertCommandOptions, IBatchCommandOptions } from './options';

/**
 * Represents a command line option
 */
export interface ICommandOption {
    flags: string;
    description: string;
    defaultValue?: boolean | string | string[];
}

/**
 * Represents a command line argument
 */
export interface ICommandArgument {
    name: string;
    description: string;
    defaultValue?: string;
}

/**
 * Defines the structure of a CLI command
 */
export interface ICommandDefinition<TOptions = IConvertCommandOptions | IBatchCommandOptions> {
    name: string;
    description: string;
    arguments?: ICommandArgument[];
    options?: ICommandOption[];
    action: (firstArg: string, options: TOptions) => Promise<void> | void;
}

/**
 * Context for command execution
 */
export interface ICommandContext {
    program: Command;
    config?: ISubtitleConfig;
}

/**
 * Interface for command creation
 */
export interface ICommandCreator {
    createCommand(context: ICommandContext): void;
}

/**
 * Interface for command registration
 */
export interface ICommandRegistry {
    registerCommand(creator: ICommandCreator): void;
    registerCommands(creators: ICommandCreator[]): void;
    getProgram(): Command;
}
