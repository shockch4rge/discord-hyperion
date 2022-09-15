import { EmbedBuilder, Guild, Message, ReplyMessageOptions } from "discord.js";

import { HyperionClient } from "../..";
import { Context } from "./Context";

export class MessageCommandContext<C extends HyperionClient = HyperionClient> extends Context<C> {
    public constructor(client: C, public readonly message: Message, guild: Guild | null) {
        super(client, guild);
    }

    public async reply(options: MessageReplyOptions) {
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

    public async followUp(options: MessageReplyOptions) {
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

export type MessageReplyOptions = EmbedBuilder | ReplyMessageOptions | string;
