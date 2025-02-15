import { Command } from 'commander';
import { ICommandCreator, ICommandRegistry } from '@subzilla/types/cli/command';

/**
 * Default implementation of command registry
 */
export class DefaultCommandRegistry implements ICommandRegistry {
    private program: Command;

    constructor(program: Command) {
        this.program = program;
    }

    public registerCommand(creator: ICommandCreator): void {
        creator.createCommand({ program: this.program });
    }

    public registerCommands(creators: ICommandCreator[]): void {
        creators.forEach(creator => this.registerCommand(creator));
    }

    public getProgram(): Command {
        return this.program;
    }
}
