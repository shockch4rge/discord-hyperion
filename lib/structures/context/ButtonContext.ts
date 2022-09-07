import {
    ActionRowBuilder, ButtonInteraction, Client, EmbedBuilder, Guild, InteractionReplyOptions,
    InteractionUpdateOptions
} from "discord.js";

import { TritonClient } from "../..";
import { Context, ReplyInteractionOptions, UpdateInteractionOptions } from "./Context";

export class ButtonContext<C extends Client = TritonClient> extends Context<C> {
    public constructor(
        client: C,
        public readonly interaction: ButtonInteraction,
        guild: Guild | null
    ) {
        super(client, guild);
    }

    public update(options: UpdateInteractionOptions) {
        if (typeof options === "string") {
            return this.interaction.update({
                content: options,
            });
        } else if (options instanceof EmbedBuilder) {
            return this.interaction.update({
                embeds: [options],
            });
        } else {
            return this.interaction.update({
                ...options,
                embeds: options.embeds?.map(builder => {
                    if (typeof builder === "function") {
                        return builder(new EmbedBuilder());
                    }

                    return builder;
                }),
                components: options.components?.map(components =>
                    new ActionRowBuilder<any>().addComponents(components)
                ),
            });
        }
    }

    public reply(options: ReplyInteractionOptions) {
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
                embeds: options.embeds?.map(builder => {
                    if (typeof builder === "function") {
                        return builder(new EmbedBuilder());
                    }

                    return builder;
                }),
                components: options.components?.map(components =>
                    new ActionRowBuilder<any>().addComponents(components)
                ),
            });
        }
    }
}
