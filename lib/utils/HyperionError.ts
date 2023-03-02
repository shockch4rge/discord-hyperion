import { color } from "./color";

export const HyperionErrors = {
    FailedToDeleteGuildCommands: (guildId: string) => color(
        c => c.redBright`Failed to delete guild commands in`,
        c => c.cyanBright`[${guildId}]`
    ),
    FailedToGetGuildCommands: (guildId: string) => color(
        c => c.redBright`Failed to get guild commands in`,
        c => c.cyanBright`[${guildId}]`
    ),
    CommandNotFound: (commandName: string) => color(
        c => c.redBright`Command`,
        c => c.cyanBright`[${commandName}]`,
        c => c.redBright`not found.`
    ),
    SubcommandNotFound: (subcommandName: string) => color(
        c => c.redBright`Subcommand`,
        c => c.cyanBright`[${subcommandName}]`,
        c => c.redBright`not found.`
    ),
    ButtonNotFound: (buttonId: string) => color(
        c => c.redBright`Button`,
        c => c.cyanBright`[${buttonId}]`,
        c => c.redBright`not found.`
    ),
    SelectMenuNotFound: (selectMenuId: string) => color(
        c => c.redBright`Select menu`,
        c => c.cyanBright`[${selectMenuId}]`,
        c => c.redBright`not found.`
    ),
    ModalNotFound: (modalId: string) => color(
        c => c.redBright`Modal`,
        c => c.cyanBright`[${modalId}]`,
        c => c.redBright`not found.`
    ),
    AccessedUndefinedDatabase: () => color(
        c => c.redBright`Accessed a database that was not provided.`
    ),
} as const;

export class HyperionError extends Error {
    public constructor(error: (errors: typeof HyperionErrors) => string, originalError?: unknown) {
        super(
            color(
                _ => error(HyperionErrors),
                c => originalError ? c.redBright`\n${(originalError as Error).stack}` : ""
            )
        );
    }
}
