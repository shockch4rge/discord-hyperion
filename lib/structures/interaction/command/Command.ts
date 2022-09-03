import {
    ContextMenuCommandInteraction, Message, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder
} from "discord.js";

import { SlashCommandContext } from "../../context";
import { GuardFactory } from "../../Guard";

export abstract class Command {
    public constructor(public readonly options: CommandOptions) {}

    public slashRun?(context: SlashCommandContext): Promise<void>;
    public messageRun?(message: Message): Promise<void>;

    public isSlashCommand() {
        return Reflect.has(this, "slashRun");
    }

    public isMessageCommand() {
        return Reflect.has(this, "messageRun");
    }

    public buildSlash() {
        const { name, description, args = [], channel } = this.options;

        const builder = new SlashCommandBuilder();

        builder.setName(name);
        builder.setDescription(description);

        if (channel === "guild") {
            builder.setDMPermission(false);
        }

        for (const arg of args) {
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
            }
        }

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
    channel?: "guild" | "dm";
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

export type ChoiceableArg<T> = {
    choices?: { name: string; value: T }[];
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
