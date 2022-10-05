import {
    ApplicationCommandType, ChatInputCommandInteraction, Collection, ContextMenuCommandBuilder,
    Message, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandBuilder
} from "discord.js";
import { MessageCommandBuilder } from "djs-message-commands";

import { Modify } from "../../../util/types";
import {
    ContextMenuCommandContext, HybridContextMenuCommandInteraction, MessageCommandContext,
    SlashCommandContext
} from "../../context";
import { GuardFactory } from "../../Guard";
import { Subcommand } from "./Subcommand";

export abstract class Command {
    public readonly options: CommandWithSubcommandsOptions;

    public constructor(options: CommandOptions) {
        this.options = options;
    }

    public slashRun?(context: SlashCommandContext): Promise<void>;

    public messageRun?(context: MessageCommandContext): Promise<void>;

    public contextMenuRun?<I extends HybridContextMenuCommandInteraction>(
        context: ContextMenuCommandContext<I>
    ): Promise<void>;

    public isSlashCommand(): this is this & { slashRun: NonNullable<typeof Command.prototype.slashRun> } {
        // parent commands of subcommands don't need to have `slashRun` defined
        return (
            Reflect.has(this, "slashRun") && !this.hasSubcommands() ||
            !Reflect.has(this, "slashRun") && this.hasSubcommands()
        );
    }

    public isMessageCommand(): this is this & {
        builder: MessageCommandBuilder,
        messageRun: NonNullable<typeof Command.prototype.messageRun>
    } {
        return Reflect.has(this, "messageRun") && Reflect.has(this, "builder");
    }

    public hasSubcommands(): this is this & {
        options: Modify<CommandWithSubcommandsOptions, { subcommands: Collection<string, Subcommand> }>
    } {
        return !!this.options.subcommands?.size;
    }

    public isContextMenuCommand(): this is this & { contextMenuRun: NonNullable<typeof Command.prototype.contextMenuRun> } {
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

            // return early as there are no arguments to build
            return builder;
        }

        for (const arg of args) {
            this.addSlashArg(builder, arg);
        }

        return builder;
    }

    private buildSubcommand(subcommand: Subcommand) {
        const { name, description, args = [] } = subcommand.options;
        const builder = new SlashCommandSubcommandBuilder();

        builder.setName(name);
        builder.setDescription(description);

        for (const arg of args) {
            this.addSlashArg(builder, arg);
        }

        return builder;
    }

    public buildContextMenu() {
        const {
            name,
            enableInDms,
            contextMenuType: type = "user",
        } = this.options;
        const builder = new ContextMenuCommandBuilder();

        builder.setName(name);
        builder.setDMPermission(enableInDms);
        builder.setType(type === "user"
            ? ApplicationCommandType.User
            : ApplicationCommandType.Message
        );

        return builder;
    }

    public buildMessage() {
        const { name, description, aliases = [], args = [] } = this.options;
        const builder = new MessageCommandBuilder();

        builder.setName(name);
        builder.setDescription(description);
        builder.setAliases(aliases);

        for (const arg of args) {
            this.addMessageArg(builder, arg);
        }

        return builder;
    }

    private addSlashArg(builder: SlashCommandBuilder | SlashCommandSubcommandBuilder, arg: CommandArgOptions) {
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

                    arg.minValue && option.setMinValue(arg.minValue);
                    arg.maxValue && option.setMaxValue(arg.maxValue);

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

                    arg.minValue && option.setMinValue(arg.minValue);
                    arg.maxValue && option.setMaxValue(arg.maxValue);

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

    private addMessageArg(builder: MessageCommandBuilder, arg: CommandArgOptions) {
        switch (arg.type) {
            case "string":
                builder.addStringOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);

                    arg.minLength && option.setMinLength(arg.minLength);
                    arg.maxLength && option.setMaxLength(arg.maxLength);

                    if (arg.choices) {
                        for (const choice of arg.choices) {
                            option.addChoices([choice.name, choice.value]);
                        }
                    }

                    return option;
                });
                break;
            case "number":
            case "integer":
                builder.addNumberOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);

                    arg.minValue && option.setMinValue(arg.minValue);
                    arg.maxValue && option.setMaxValue(arg.maxValue);

                    if (arg.choices) {
                        for (const choice of arg.choices) {
                            option.addChoices([choice.name, choice.value]);
                        }
                    }

                    return option;
                });
                break;
            case "boolean":
                builder.addBooleanOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);

                    return option;
                });
                break;
            case "mentionable":
                builder.addMentionableOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);

                    return option;
                });
                break;
            case "user":
                builder.addMemberOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);

                    return option;
                });
                break;
            case "channel":
                builder.addChannelOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);

                    return option;
                });
                break;
            case "role":
                builder.addRoleOption(option => {
                    option.setName(arg.name);
                    option.setDescription(arg.description);

                    return option;
                });
                break;
            default:
                break;

        }
    }
}

export type CommandOptions = Readonly<{
    name: string;
    description: string;
    detailedDescription?: string[];
    aliases?: string[];
    args?: CommandArgOptions[];
    guards?: GuardFactory[];
    ephemeral?: boolean;
    enableInDms?: boolean;
    contextMenuType?: "message" | "user";
}>;

export type CommandWithSubcommandsOptions = CommandOptions & Readonly<{
    subcommands?: Collection<string, Subcommand>;
}>;

export type CommandArgOptions = BaseArgOptions &
    (
        | AttachmentArgOptions
        | BooleanArgOptions
        | ChannelArgOptions
        | IntegerArgOptions
        | MentionableArgOptions
        | NumberArgOptions
        | RoleArgOptions
        | StringArgOptions
        | UserArgOptions
    );

export type BaseArgOptions = {
    name: string;
    description: string;
    detailedDescription?: string[];
    required?: boolean;
};

export type ChoiceableArg<ValueType> = {
    choices?: Array<{ name: string; value: ValueType }>;
};

export type AutocompleteableArg = {
    autocomplete?: boolean;
};

export type ArgType<T extends OptionType<keyof SlashCommandOptionsOnlyBuilder>> = {
    type: Extract<T, T>;
};

export type StringArgOptions = ArgType<"string"> & AutocompleteableArg & ChoiceableArg<string> & {
    minLength?: number;
    maxLength?: number;
};

export type NumberArgOptions = ArgType<"number"> & AutocompleteableArg & ChoiceableArg<number> & {
    minValue?: number;
    maxValue?: number;
};

export type IntegerArgOptions = ArgType<"integer"> & AutocompleteableArg & ChoiceableArg<number> & {
    minValue?: number;
    maxValue?: number;
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
    public constructor(public readonly interaction: ChatInputCommandInteraction) { }

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
        if (required) {
            return this.interaction.options.getSubcommand();
        }

        return this.interaction.options.getSubcommand(false);
    }
}
