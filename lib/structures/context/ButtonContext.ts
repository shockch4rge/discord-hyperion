import {
    ButtonInteraction, Client, EmbedBuilder, Guild, InteractionReplyOptions,
    InteractionUpdateOptions
} from "discord.js";

import { TritonClient } from "../..";
import { Context } from "./Context";

export class ButtonContext<C extends Client = TritonClient> extends Context<C> {
    public constructor(
        client: C,
        public readonly interaction: ButtonInteraction,
        guild: Guild | null
    ) {
        super(client, guild);
    }

    public reply(options: ButtonReplyOptions) {
        if (typeof options === "string") {
            return this.interaction.reply({
                content: options,
            });
        } else if (options instanceof EmbedBuilder) {
            return this.interaction.reply({
                embeds: [options],
            });
        } else {
            return this.interaction.reply(options);
        }
    }

    public update(options: ButtonUpdateOptions) {
        if (typeof options === "string") {
            return this.interaction.update({
                content: options,
            });
        } else if (options instanceof EmbedBuilder) {
            return this.interaction.update({
                embeds: [options],
            });
        } else {
            return this.interaction.update(options);
        }
    }
}

export type ButtonReplyOptions = string | EmbedBuilder | InteractionReplyOptions;
export type ButtonUpdateOptions = string | EmbedBuilder | InteractionUpdateOptions;
