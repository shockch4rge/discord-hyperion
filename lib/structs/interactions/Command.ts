import type { ConcreteGuardConstructor, } from "../Guard";
import type { BaseAutocompleteContext, BaseSlashCommandContext } from "../contexts";
import type {
    Collection,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from "discord.js";
import type { Modify } from "../../utils";

export type AnySlashCommandBuilder =
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;

export abstract class Command {
    public readonly builder: AnySlashCommandBuilder;
    public readonly detailedDescription?: string;
    public readonly guards?: ConcreteGuardConstructor[];
    public readonly ephemeral: boolean;

    protected constructor(options: CommandOptions) {
        this.builder = options.builder;
        this.detailedDescription = options.detailedDescription?.join(" ");
        this.guards = options.guards;
        this.ephemeral = options.ephemeral ?? true;
    }

    public isSlashCommand(): this is Modify<this, { slashRun: NonNullable<typeof Command.prototype.slashRun> }> {
        return Reflect.has(this, "slashRun");
    }

    public hasSubcommands(): this is WithSubcommands<this> {
        return Reflect.has(this, "subcommands");
    }

    public slashRun?(context: BaseSlashCommandContext): Promise<void>;

    public autocompleteRun?(context: BaseAutocompleteContext): Promise<void>;
}

export abstract class Subcommand<Parent extends Command = Command> {
    public readonly builder: SlashCommandSubcommandBuilder;
    public readonly detailedDescription?: string;
    public readonly guards?: ConcreteGuardConstructor[];
    public readonly ephemeral: boolean;

    protected constructor(
        public readonly command: Omit<Parent, "hasSubcommands" | "slashRun">,
        options: SubcommandOptions
    ) {
        this.builder = options.builder;
        this.detailedDescription = options.detailedDescription?.join(" ");
        this.guards = options.guards;
        this.ephemeral = options.ephemeral ?? true;
    }

    public abstract run(context: BaseSlashCommandContext): Promise<void>;
}

export type ConcreteSubcommandConstructor = new (
    command: Omit<Command, "hasSubcommands" | "slashRun">,
) => Subcommand;

export type WithSubcommands<C extends Command> = C & {
    subcommands: Collection<string, Subcommand>;
};

export type CommandOptions = {
    detailedDescription?: string[];
    builder: AnySlashCommandBuilder;
    ephemeral?: boolean;
    guards?: ConcreteGuardConstructor[];
};

export type SubcommandOptions = Modify<CommandOptions, { builder: SlashCommandSubcommandBuilder }>;