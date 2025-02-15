import { ICommandCreator, ICommandContext, ICommandDefinition } from '@subzilla/types/cli/command';
import { IConvertCommandOptions, IBatchCommandOptions } from '@subzilla/types/cli/options';

/**
 * Base class for command creators
 */
export abstract class BaseCommandCreator<TOptions = IConvertCommandOptions | IBatchCommandOptions>
    implements ICommandCreator
{
    protected abstract getDefinition(): ICommandDefinition<TOptions>;

    public createCommand(context: ICommandContext): void {
        const definition = this.getDefinition();
        const command = context.program.command(definition.name);

        command.description(definition.description);

        // Add arguments
        definition.arguments?.forEach(arg => {
            if (arg.defaultValue) {
                command.argument(`[${arg.name}]`, arg.description, arg.defaultValue);
            } else {
                command.argument(`<${arg.name}>`, arg.description);
            }
        });

        // Add options
        definition.options?.forEach(opt => {
            if (opt.defaultValue !== undefined) {
                command.option(opt.flags, opt.description, opt.defaultValue);
            } else {
                command.option(opt.flags, opt.description);
            }
        });

        // Add action
        command.action(definition.action);
    }
}
