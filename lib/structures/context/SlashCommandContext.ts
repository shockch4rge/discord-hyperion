import {
    ActionRowBuilder, AnyComponentBuilder, ChatInputCommandInteraction, Client, EmbedBuilder, Guild,
    InteractionReplyOptions
} from "discord.js";

import { TritonClient } from "../..";
import { CommandArgResolver } from "../interaction/command/Command";
import { Context } from "./Context";

export class SlashCommandContext<C extends Client = TritonClient> extends Context<C> {
    public constructor(
        client: C,
        public readonly interaction: ChatInputCommandInteraction,
        public readonly args: CommandArgResolver,
        guild: Guild | null
    ) {
        super(client, guild);
    }

    public async reply(options: SlashReplyOptions) {
        if (typeof options === "string") {
            return this.interaction.editReply({
                content: options,
            });
        } else if (options instanceof EmbedBuilder) {
            return this.interaction.editReply({
                embeds: [options],
            });
        } else {
            return this.interaction.editReply({
                ...options,
                components: options.components?.map(components =>
                    // leave as any as our API abstracts ActionRow anyway
                    new ActionRowBuilder<any>().addComponents(components)
                ),
            });
        }
    }

    public async embed(builder: (embed: EmbedBuilder) => EmbedBuilder) {
        return this.reply(builder(new EmbedBuilder()));
    }

    public async followUp(options: SlashReplyOptions) {
        if (typeof options === "string") {
            return this.interaction.followUp({
                content: options,
            });
        } else if (options instanceof EmbedBuilder) {
            return this.interaction.followUp({
                embeds: [options],
            });
        } else {
            return this.interaction.followUp({
                ...options,
                components: options.components?.map(components =>
                    // leave as any as our API abstracts ActionRow anyway
                    new ActionRowBuilder<any>().addComponents(components)
                ),
            });
        }
    }
}

export type SlashReplyOptions =
    | string
    | EmbedBuilder
    | (Omit<InteractionReplyOptions, "components"> & {
          components?: AnyComponentBuilder[][];
      });
