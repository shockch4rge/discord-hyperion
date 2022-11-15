import { ActionRowBuilder, ButtonInteraction } from "discord.js";

import { HyperionClient } from "../..";
import { resolveEmbed } from "../../util/resolvers";
import {
    AltInteractionReplyOptions, AltInteractionUpdateOptions, BaseContext
} from "./BaseContext";

export class BaseButtonContext<C extends HyperionClient = HyperionClient> extends BaseContext<C> {
    public constructor(
        client: C,
        public readonly interaction: ButtonInteraction,
    ) {
        super(client, interaction.guild);
    }

    public async update(options: AltInteractionUpdateOptions) {
        if (this.interaction.replied) {
            this.client.logger.error("Interaction already replied to.");
        }

        if (typeof options === "string") {
            return this.interaction.update({
                content: options,
            });
        }

        if (this.isEmbedBuildable(options)) {
            const embed = resolveEmbed(options);

            return this.interaction.update({
                embeds: [embed],
            });
        }

        return this.interaction.update({
            ...options,
            embeds: options.embeds?.map(resolveEmbed),
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
            const embed = resolveEmbed(options);

            return this.interaction.editReply({
                embeds: [embed],
            });
        }

        return this.interaction.editReply({
            ...options,
            embeds: options.embeds?.map(resolveEmbed),
            components: options.components?.map(components =>
                new ActionRowBuilder<any>().addComponents(components)
            ),
        });
    }
}
