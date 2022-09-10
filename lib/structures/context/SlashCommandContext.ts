import {
    ActionRowBuilder, AnyComponentBuilder, ChatInputCommandInteraction, Client, EmbedBuilder, Guild,
    InteractionReplyOptions
} from "discord.js";

import { TritonClient } from "../..";
import { CommandArgResolver } from "../interaction/command/Command";
import { AltInteractionReplyOptions, Context } from "./Context";

export class SlashCommandContext<C extends TritonClient = TritonClient> extends Context<C> {
    public constructor(
        client: C,
        public readonly interaction: ChatInputCommandInteraction,
        public readonly args: CommandArgResolver,
        guild: Guild | null
    ) {
        super(client, guild);
    }

    public async reply(options: AltInteractionReplyOptions) {
        if (typeof options === "string") {
            if (this.interaction.replied) {
                return this.interaction.editReply({
                    content: options,
                });
            }

            return this.interaction.reply({
                content: options,
            });
        }

        if (this.isEmbedBuildable(options)) {
            const embed = options instanceof EmbedBuilder ? options : options(new EmbedBuilder());

            if (this.interaction.replied) {
                return this.interaction.editReply({
                    embeds: [embed],
                });
            }

            return this.interaction.reply({
                embeds: [embed],
            });
        }

        return this.interaction.editReply({
            ...options,
            embeds: options.embeds?.map(builder => {
                return builder instanceof EmbedBuilder ? builder : builder(new EmbedBuilder());
            }),
            components: options.components?.map(components =>
                // leave as any as our API abstracts ActionRow anyway
                new ActionRowBuilder<any>().addComponents(components)
            ),
        });
    }

    public async embedReply(builder: (embed: EmbedBuilder) => EmbedBuilder) {
        return this.reply(builder(new EmbedBuilder()));
    }

    public async embedFollowUp(builder: (embed: EmbedBuilder) => EmbedBuilder) {
        return this.followUp(builder(new EmbedBuilder()));
    }

    public async followUp(options: AltInteractionReplyOptions) {
        if (typeof options === "string") {
            return this.interaction.followUp({
                content: options,
            });
        }

        if (this.isEmbedBuildable(options)) {
            const embed = options instanceof EmbedBuilder ? options : options(new EmbedBuilder());

            return this.interaction.followUp({
                embeds: [embed],
            });
        }

        return this.interaction.followUp({
            ...options,
            embeds: options.embeds?.map(builder =>
                builder instanceof EmbedBuilder ? builder : builder(new EmbedBuilder())
            ),
            components: options.components?.map(components =>
                new ActionRowBuilder<any>().addComponents(components)
            ),
        });
    }
}
