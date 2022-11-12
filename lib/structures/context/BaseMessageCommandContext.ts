import { EmbedBuilder, Message } from "discord.js";

import { HyperionClient } from "../..";
import { AltMessageReplyOptions, BaseContext } from "./BaseContext";

export class BaseMessageCommandContext<C extends HyperionClient = HyperionClient> extends BaseContext<C> {
    public constructor(client: C, public readonly message: Message, private readonly _args: unknown[]) {
        super(client, message.guild);
    }

    public args<T0>(): T0;
    public args<T0, T1>(): [T0, T1];
    public args<T0, T1, T2>(): [T0, T1, T2];
    public args<T0, T1, T2, T3>(): [T0, T1, T2, T3];
    public args<T0, T1, T2, T3, T4>(): [T0, T1, T2, T3, T4];
    public args<T0, T1, T2, T3, T4, T5>(): [T0, T1, T2, T3, T4, T5];
    public args<T0, T1, T2, T3, T4, T5, T6>(): [T0, T1, T2, T3, T4, T5, T6];
    public args<T0, T1, T2, T3, T4, T5, T6, T7>(): [T0, T1, T2, T3, T4, T5, T6, T7];
    public args<T0, T1, T2, T3, T4, T5, T6, T7, T8>(): [T0, T1, T2, T3, T4, T5, T6, T7, T8];
    public args<T0, T1, T2, T3, T4, T5, T6, T7, T8, T9>(): [T0, T1, T2, T3, T4, T5, T6, T7, T8, T9];
    public args<T>(): T[] {
        return this._args as T[];
    }

    public async reply(options: AltMessageReplyOptions) {
        if (typeof options === "string") {
            return this.message.reply({
                content: options,
            });
        }

        if (this.isEmbedBuildable(options)) {
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
