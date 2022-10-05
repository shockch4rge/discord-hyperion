import { EmbedBuilder, Guild, Message, MessageReplyOptions } from "discord.js";

import { HyperionClient } from "../..";
import { Context } from "./Context";

export class MessageCommandContext<C extends HyperionClient = HyperionClient> extends Context<C> {
    public constructor(client: C, public readonly message: Message, public readonly args: unknown[], guild: Guild | null) {
        super(client, guild);
    }

    public async reply(options: AltMessageReplyOptions) {
        if (typeof options === "string") {
            return this.message.reply({
                content: options,
            });
        }

        if (options instanceof EmbedBuilder) {
            return this.message.reply({
                embeds: [options],
            });
        }

        return this.message.reply(options);
    }

    public async followUp(options: AltMessageReplyOptions) {
        if (typeof options === "string") {
            return this.message.channel.send({
                content: options,
            });
        }

        if (options instanceof EmbedBuilder) {
            return this.message.channel.send({
                embeds: [options],
            });
        }

        return this.message.channel.send(options);
    }
}

export type AltMessageReplyOptions = EmbedBuilder | MessageReplyOptions | string;