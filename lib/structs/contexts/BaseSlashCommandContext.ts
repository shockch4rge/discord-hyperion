import type { AltReplyOptions } from "./BaseContext";
import { BaseContext } from "./BaseContext";
import type {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    CommandInteractionOption,
    MessageActionRowComponentBuilder
} from "discord.js";
import { ActionRowBuilder, EmbedBuilder } from "discord.js";
import reify from "../../utils/reify";
import type { HyperionClient } from "../HyperionClient";

export class BaseSlashCommandContext<C extends HyperionClient = HyperionClient, DB = any> extends BaseContext<C, DB> {
    public readonly args: CommandArgumentResolver;

    public constructor(
        client: C,
        public readonly interaction: ChatInputCommandInteraction,
    ) {
        super(client, interaction);
        this.args = new CommandArgumentResolver(interaction);
    }

    public async reply(options: AltReplyOptions) {
        if (this.interaction.replied) {
            return this.editReply(options);
        }

        if (typeof options === "string") {
            return this.interaction.reply(options);
        }

        if (typeof options === "function" || options instanceof EmbedBuilder) {
            return this.interaction.reply({ embeds: [reify.embed(options)] });
        }

        return this.interaction.reply({
            ...options,
            embeds: options.embeds?.map(reify.embed),
            components: options.components?.map(components =>
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(components)
            ),
        });
    }

    public async editReply(options: AltReplyOptions) {
        if (typeof options === "string") {
            return this.interaction.editReply(options);
        }

        if (typeof options === "function" || options instanceof EmbedBuilder) {
            return this.interaction.editReply({ embeds: [reify.embed(options)] });
        }

        return this.interaction.editReply({
            ...options,
            embeds: options.embeds?.map(reify.embed),
            components: options.components?.map(components =>
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(components)
            ),
        });
    }

    public async followUp(options: AltReplyOptions) {
        if (typeof options === "string") {
            return this.interaction.followUp(options);
        }

        if (typeof options === "function" || options instanceof EmbedBuilder) {
            return this.interaction.followUp({ embeds: [reify.embed(options)] });
        }

        return this.interaction.followUp({
            ...options,
            embeds: options.embeds?.map(reify.embed),
            components: options.components?.map(components =>
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(components)
            ),
        });
    }
}

export abstract class SharedArgumentResolver<I extends AutocompleteInteraction | ChatInputCommandInteraction> {
    protected constructor(protected readonly interaction: I) {}

    public number(name: string) {
        return this.interaction.options.getNumber(name);
    }

    public subcommand() {
        return this.interaction.options.getSubcommand();
    }

    public subcommandGroup() {
        return this.interaction.options.getSubcommandGroup();
    }

    public integer(name: string) {
        return this.interaction.options.getInteger(name);
    }

    public string(name: string) {
        return this.interaction.options.getString(name);
    }

    public boolean(name: string) {
        return this.interaction.options.getBoolean(name);
    }
}

export class CommandArgumentResolver extends SharedArgumentResolver<ChatInputCommandInteraction> {
    constructor(interaction: ChatInputCommandInteraction) {
        super(interaction);
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

    public mentionable(name: string): NonNullable<CommandInteractionOption["member" | "role" | "user"]> | null {
        return this.interaction.options.getMentionable(name);
    }
}

export class AutocompleteArgumentResolver extends SharedArgumentResolver<AutocompleteInteraction> {
    public constructor(interaction: AutocompleteInteraction) {
        super(interaction);
    }

    public focused() {
        return this.interaction.options.getFocused(true);
    }
}