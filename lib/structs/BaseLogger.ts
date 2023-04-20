import pino from "pino";
import type { EmbedBuilder, TextChannel } from "discord.js";
import type { Reify } from "../utils";
import reify from "../utils/reify";

export class BaseLogger {
    public channel?: TextChannel;

    private pino = pino({
        name: "Hyperion",
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
            },
        },
    });

    public async log(payload: LogPayload) {
        if (typeof payload === "string") {
            await this.info(payload);
            return;
        }

        await this.info(payload.message);
        this.channel?.send({
            embeds: this.normalizeEmbeds(payload),
        });
    }

    public async debug(payload: LogPayload) {
        if (typeof payload === "string") {
            this.pino.debug(payload);
            return;
        }

        this.pino.debug(payload.message);
        this.channel?.send({
            embeds: this.normalizeEmbeds(payload),
        });
    }

    public async info(payload: LogPayload) {
        if (typeof payload === "string") {
            this.pino.info(payload);
            return;
        }

        this.pino.info(payload.message);
        this.channel?.send({
            embeds: this.normalizeEmbeds(payload),
        });
    }

    public async warn(payload: LogPayload) {
        if (typeof payload === "string") {
            this.pino.warn(payload);
            return;
        }

        this.pino.warn(payload.message);
        this.channel?.send({
            embeds: this.normalizeEmbeds(payload),
        });
    }

    public async error(payload: LogPayload) {
        if (typeof payload === "string") {
            this.pino.error(payload);
            return;
        }

        this.pino.error(payload.message);
        this.channel?.send({
            embeds: this.normalizeEmbeds(payload),
        });
    }

    private normalizeEmbeds(payload: Exclude<LogPayload, string>) {
        if (Array.isArray(payload.embeds)) {
            return payload.embeds?.map(reify.embed);
        }

        return payload.embeds?.(payload.message).map(reify.embed);
    }
}

type LogPayload = string | {
    message: string;
    embeds?: Array<Reify<EmbedBuilder>> | ((message: string) => Array<Reify<EmbedBuilder>>);
};