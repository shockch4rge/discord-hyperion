import { ActionRowBuilder, ButtonInteraction, EmbedBuilder, Guild } from "discord.js";

import { HyperionClient } from "../..";
import { AltInteractionReplyOptions, AltInteractionUpdateOptions, Context } from "./Context";

export class ButtonContext<C extends HyperionClient = HyperionClient> extends Context<C> {
    public constructor(
        client: C,
        public readonly interaction: ButtonInteraction,
        guild: Guild | null
    ) {
        super(client, guild);
    }

    public async update(options: AltInteractionUpdateOptions) {
        if (this.interaction.replied) {
            this.client.logger.warn("Interaction already replied to.");
            return;
        }

        if (typeof options === "string") {
            return this.interaction.update({
                content: options,
            });
        }

        if (this.isEmbedBuildable(options)) {
            const embed = options instanceof EmbedBuilder ? options : options(new EmbedBuilder());

            return this.interaction.update({
                embeds: [embed],
            });
        }

        return this.interaction.update({
            ...options,
            embeds: options.embeds?.map(builder =>
                builder instanceof EmbedBuilder ? builder : builder(new EmbedBuilder())
            ),
            components: options.components?.map(components =>
                new ActionRowBuilder<any>().addComponents(components)
            ),
        });
    }

    public async reply(options: AltInteractionReplyOptions) {
        if (typeof options === "string") {
            return this.interaction.editReply({
                content: options,
            });
        }

        if (this.isEmbedBuildable(options)) {
            const embed = options instanceof EmbedBuilder ? options : options(new EmbedBuilder());

            return this.interaction.editReply({
                embeds: [embed],
            });
        }

        return this.interaction.editReply({
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
