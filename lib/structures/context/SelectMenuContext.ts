import {
    Client, EmbedBuilder, Guild, InteractionReplyOptions, InteractionUpdateOptions,
    SelectMenuInteraction
} from "discord.js";

import { TritonClient } from "../../TritonClient";
import { Context } from "./Context";

export class SelectMenuContext<C extends Client = TritonClient> extends Context<C> {
    public readonly deferred: boolean;

    public constructor(
        client: C,
        public readonly interaction: SelectMenuInteraction,
        guild: Guild | null
    ) {
        super(client, guild);
        this.deferred = false;
    }

    public get values() {
        return this.interaction.values;
    }

    public get value() {
        return this.interaction.values[0];
    }

    public embed(builder: (embed: EmbedBuilder) => EmbedBuilder) {
        return this.update(builder(new EmbedBuilder()));
    }

    public reply(options: SelectMenuReplyOptions) {
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

    public update(options: SelectMenuUpdateOptions) {
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

export type SelectMenuReplyOptions = string | EmbedBuilder | InteractionReplyOptions;
export type SelectMenuUpdateOptions = string | EmbedBuilder | InteractionUpdateOptions;
