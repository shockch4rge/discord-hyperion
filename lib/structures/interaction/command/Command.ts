import {
    ApplicationCommandType,
    ChatInputCommandInteraction,
    Collection,
    ContextMenuCommandBuilder,
    Message,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandBuilder,
} from "discord.js";

import {
    ContextMenuCommandContext,
    HybridContextMenuCommandInteraction,
    SlashCommandContext,
} from "../../context";
import { GuardFactory } from "../../Guard";
import { Subcommand } from "./Subcommand";

export abstract class Command {
    public readonly options: CommandWithSubcommandOptions;

    public constructor(options: CommandOptions) {
        this.options = options;
    }

    public slashRun?(context: SlashCommandContext): Promise<void>;
    public messageRun?(message: Message): Promise<void>;
    public contextMenuRun?<I extends HybridContextMenuCommandInteraction>(
        context: ContextMenuCommandContext<I>
    ): Promise<void>;

    public isSlashCommand() {
        return (
            (Reflect.has(this, "slashRun") && !this.hasSubcommands()) ||
            (!Reflect.has(this, "slashRun") && this.hasSubcommands())
        );
    }

    public isMessageCommand() {
        return Reflect.has(this, "messageRun");
    }

    public hasSubcommands() {
        return this.options.subcommands ? this.options.subcommands.size > 0 : false;
    }

    public isContextMenuCommand() {
        return Reflect.has(this, "contextMenuRun");
    }

    public buildSlash() {
        const { name, description, args = [], enableInDms = false, subcommands } = this.options;

        const builder = new SlashCommandBuilder();

        builder.setName(name);
        builder.setDescription(description);
        builder.setDMPermission(enableInDms);

        if (subcommands) {
            for (const [, subcommand] of subcommands) {
                builder.addSubcommand(this.buildSubcommand(subcommand));
            }

            // return early there are no arguments to build
            return builder;
        }

        for (const arg of args) {
            this.addArg(builder, arg);
        }

        return builder;
    }

    private buildSubcommand(subcommand: Subcommand) {
        const { name, description, args = [] } = subcommand.options;
        const builder = new SlashCommandSubcommandBuilder();

        builder.setName(name);
        builder.setDescription(description);

        for (const arg of args) {
            this.addArg(builder, arg);
        }

        return builder;
    }

    private addArg(builder: SlashCommandBuilder | SlashCommandSubcommandBuilder, arg: CommandArg) {
        switch (arg.type) {
            case "string":
                builder.addStringOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);
                    option.setRequired(arg.required ?? true);
                    option.setAutocomplete(arg.autocomplete ?? true);

                    arg.minLength && option.setMinLength(arg.minLength);
                    arg.maxLength && option.setMaxLength(arg.maxLength);

                    if (arg.choices) {
                        for (const choice of arg.choices) {
                            option.addChoices(choice);
                        }
                    }

                    return option;
                });
                break;
            case "number":
                builder.addNumberOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);
                    option.setRequired(arg.required ?? true);
                    option.setAutocomplete(arg.autocomplete ?? true);

                    arg.min && option.setMinValue(arg.min);
                    arg.max && option.setMaxValue(arg.max);

                    if (arg.choices) {
                        for (const choice of arg.choices) {
                            option.addChoices(choice);
                        }
                    }

                    return option;
                });
                break;
            case "integer":
                builder.addIntegerOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);
                    option.setRequired(arg.required ?? true);
                    option.setAutocomplete(arg.autocomplete ?? true);

                    arg.min && option.setMinValue(arg.min);
                    arg.max && option.setMaxValue(arg.max);

                    if (arg.choices) {
                        for (const choice of arg.choices) {
                            option.addChoices(choice);
                        }
                    }

                    return option;
                });
                break;
            case "boolean":
                builder.addBooleanOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);
                    option.setRequired(arg.required ?? true);

                    return option;
                });
                break;
            case "mentionable":
                builder.addMentionableOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);
                    option.setRequired(arg.required ?? true);

                    return option;
                });
                break;
            case "user":
                builder.addUserOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);
                    option.setRequired(arg.required ?? true);

                    return option;
                });
                break;
            case "channel":
                builder.addChannelOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);
                    option.setRequired(arg.required ?? true);

                    return option;
                });
                break;
            case "role":
                builder.addRoleOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);
                    option.setRequired(arg.required ?? true);

                    return option;
                });
                break;
            case "attachment":
                builder.addAttachmentOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);
                    option.setRequired(arg.required ?? true);

                    return option;
                });
                break;
            default:
                break;
        }

        return builder;
    }

    public buildContextMenu() {
        const {
            name,
            enableInDms: channel = "guild",
            contextMenuType: type = "user",
        } = this.options;
        const builder = new ContextMenuCommandBuilder();

        builder.setName(name);
        builder.setDMPermission(channel === "guild" ? false : true);
        builder.setType(
            type === "user" || type === "client"
                ? ApplicationCommandType.User
                : ApplicationCommandType.Message
        );

        return builder;
    }
}

export type CommandOptions = {
    name: string;
    description: string;
    detailedDescription?: string[];
    aliases?: string[];
    args?: CommandArg[];
    guards?: GuardFactory[];
    ephemeral?: boolean;
    enableInDms?: boolean;
    contextMenuType?: "user" | "message" | "client";
};

export type CommandWithSubcommandOptions = CommandOptions & {
    subcommands?: Collection<string, Subcommand>;
};

export type CommandArg = BaseArgOptions &
    (
        | StringArgOptions
        | NumberArgOptions
        | IntegerArgOptions
        | BooleanArgOptions
        | MentionableArgOptions
        | UserArgOptions
        | ChannelArgOptions
        | RoleArgOptions
        | AttachmentArgOptions
    );

export type BaseArgOptions = {
    name: string;
    description: string;
    detailedDescription?: string[];
    required?: boolean;
};

export type ChoiceableArg<ValueType> = {
    choices?: { name: string; value: ValueType }[];
};

export type AutocompleteableArg = {
    autocomplete?: boolean;
};

export type ArgType<T extends OptionType<keyof SlashCommandOptionsOnlyBuilder>> = {
    type: Extract<T, T>;
};

export type StringArgOptions = ArgType<"string"> &
    ChoiceableArg<string> &
    AutocompleteableArg & {
        minLength?: number;
        maxLength?: number;
    };

export type NumberArgOptions = ArgType<"number"> &
    ChoiceableArg<number> &
    AutocompleteableArg & {
        min?: number;
        max?: number;
    };

export type IntegerArgOptions = ArgType<"integer"> &
    ChoiceableArg<number> &
    AutocompleteableArg & {
        min?: number;
        max?: number;
    };

export type BooleanArgOptions = ArgType<"boolean">;

export type MentionableArgOptions = ArgType<"mentionable">;

export type UserArgOptions = ArgType<"user">;

export type ChannelArgOptions = ArgType<"channel">;

export type RoleArgOptions = ArgType<"role">;

export type AttachmentArgOptions = ArgType<"attachment">;

export type OptionType<MethodName> = MethodName extends `add${infer T}Option`
    ? Uncapitalize<T>
    : never;

export class CommandArgResolver {
    public constructor(public readonly interaction: ChatInputCommandInteraction) {}

    public string(name: string) {
        return this.interaction.options.getString(name);
    }

    public integer(name: string) {
        return this.interaction.options.getInteger(name);
    }

    public number(name: string) {
        return this.interaction.options.getNumber(name);
    }

    public boolean(name: string) {
        return this.interaction.options.getBoolean(name);
    }

    public user(name: string) {
        return this.interaction.options.getUser(name);
    }

    public member(name: string) {
        return this.interaction.options.getMember(name);
    }

    public channel(name: string) {
        return this.interaction.options.getChannel(name);
    }

    public role(name: string) {
        return this.interaction.options.getRole(name);
    }

    public mentionable(name: string) {
        return this.interaction.options.getMentionable(name);
    }

    public subcommand(required?: true) {
        if (required === undefined || required === true) {
            return this.interaction.options.getSubcommand();
        }

        return this.interaction.options.getSubcommand(false);
    }
}
