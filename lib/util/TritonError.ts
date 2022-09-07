import chalk from "chalk";

export const TritonErrors = {
    PathNotFound: (path: string) => `Path not found: ${path}` as const,
    CommandNotFound: (command: string) => `Command '${command}' not found.` as const,
    SubcommandNotFound: (subcommand: string) => `Subcommand '${subcommand}' not found.` as const,
    ButtonNotFound: (button: string) => `Button '${button}' not found.` as const,
    SelectMenuNotFound: (selectMenu: string) => `Select menu '${selectMenu}' not found.` as const,
    ModalNotFound: (modal: string) => `Modal '${modal}' not found.` as const,
    DeleteGuildCommandsFail: (guildId: string) =>
        `Failed to delete commands in guild ID [${guildId}].` as const,
};

export type ErrorKey = keyof typeof TritonErrors;
export type ErrorArgs<K extends ErrorKey> = Parameters<typeof TritonErrors[K]>;

export class TritonError<K extends ErrorKey> extends Error {
    public constructor(
        error: (errors: typeof TritonErrors) => typeof TritonErrors[K],
        ...args: ErrorArgs<K>
    ) {
        // @ts-ignore until I figure out how to fix ...args' type
        super(chalk.red`${error(TritonErrors)(...args)}`);
    }
}
