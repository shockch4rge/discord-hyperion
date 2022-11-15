import chalk from "chalk";

export const HyperionErrors = {
    PathNotFound: (path: string) => `Path not found: ${path}` as const,
    CommandNotFound: (command: string) => `Command '${command}' not found.` as const,
    SubcommandNotFound: (subcommand: string) => `Subcommand '${subcommand}' not found.` as const,
    ButtonNotFound: (button: string) => `Button '${button}' not found.` as const,
    SelectMenuNotFound: (selectMenu: string) => `Select menu '${selectMenu}' not found.` as const,
    ModalNotFound: (modal: string) => `Modal '${modal}' not found.` as const,
    DeleteGuildCommandsFail: (guildId: string) =>
        `Failed to delete commands in guild ID [${guildId}].` as const,
    DuplicateMessageCommandAlias: (alias: string, original: string) =>
        `Duplicate message command alias '${alias}' for '${original}' found.` as const,
};

export type HErrors = typeof HyperionErrors;
export type HErrorKey = keyof HErrors;
export type HErrorArgs<K extends HErrorKey> = Parameters<HErrors[K]>;

export class HyperionError<K extends HErrorKey = HErrorKey> extends Error {
    public constructor(error: (errors: HErrors) => HErrors[K], ...args: HErrorArgs<K>) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore until I figure out how to fix ...args' type
        super(chalk.red`${error(HyperionErrors)(...args)}`);
    }
}
