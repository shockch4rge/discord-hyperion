import { SlashCommandContext } from "../../context";
import { Command, CommandOptions } from "./Command";

export abstract class Subcommand<C extends Command = Command> {
    public constructor(public readonly command: C, public readonly options: SubcommandOptions) {}

    public abstract slashRun(context: SlashCommandContext): Promise<void>;
}

export type SubcommandOptions = Omit<CommandOptions, "channel" | "enableInDms" | "contextMenuType">;