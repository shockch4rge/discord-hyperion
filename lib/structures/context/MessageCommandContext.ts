import { Client, EmbedBuilder, Guild, Message, ReplyMessageOptions } from "discord.js";

import { TritonClient } from "../..";
import { Context } from "./Context";

export class MessageCommandContext<C extends TritonClient = TritonClient> extends Context<C> {
    public constructor(client: C, public readonly message: Message, guild: Guild | null) {
        super(client, guild);
    }

    public async reply(options: MessageReplyOptions) {
        if (typeof options === "string") {
            return this.message.reply({
                content: options,
            });
        } else if (options instanceof EmbedBuilder) {
            return this.message.reply({
                embeds: [options],
            });
        } else {
            return this.message.reply(options);
        }
    }

    public async followUp(options: MessageReplyOptions) {
        if (typeof options === "string") {
            return this.message.channel.send({
                content: options,
            });
        } else if (options instanceof EmbedBuilder) {
            return this.message.channel.send({
                embeds: [options],
            });
        } else {
            return this.message.channel.send(options);
        }
    }
}

export type MessageReplyOptions = string | EmbedBuilder | ReplyMessageOptions;
