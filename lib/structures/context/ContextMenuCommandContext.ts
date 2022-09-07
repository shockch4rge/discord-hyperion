import {
    ActionRowBuilder, ContextMenuCommandInteraction, EmbedBuilder, Guild, Message,
    MessageContextMenuCommandInteraction, User, UserContextMenuCommandInteraction
} from "discord.js";

import { TritonClient } from "../../TritonClient";
import { Context, ReplyInteractionOptions } from "./Context";

export class ContextMenuCommandContext<
    I extends HybridContextMenuCommandInteraction,
    C extends TritonClient = TritonClient
> extends Context<C> {
    public constructor(public readonly interaction: I, client: C, guild: Guild | null) {
        super(client, guild);
    }

    public target() {
        if (this.interaction.isUserContextMenuCommand()) {
            return this.interaction.targetUser;
        }

        return this.interaction.targetMessage;
    }

    public async embedReply(builder: (embed: EmbedBuilder) => EmbedBuilder) {
        return this.reply(builder(new EmbedBuilder()));
    }

    public async embedFollowUp(builder: (embed: EmbedBuilder) => EmbedBuilder) {
        return this.followUp(builder(new EmbedBuilder()));
    }

    public async reply(options: ReplyInteractionOptions) {
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

    public async followUp(options: ReplyInteractionOptions) {
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
                embeds: options.embeds?.map(builder => {
                    if (typeof builder === "function") {
                        return builder(new EmbedBuilder());
                    }

                    return builder;
                }),
                components: options.components?.map(components =>
                    // leave as any as our API abstracts ActionRow anyway
                    new ActionRowBuilder<any>().addComponents(components)
                ),
            });
        }
    }
}

export type HybridContextMenuCommandInteraction =
    | UserContextMenuCommandInteraction
    | MessageContextMenuCommandInteraction;
