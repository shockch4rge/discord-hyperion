import chalk from "chalk";
import { Client, ClientOptions } from "discord.js";
import { parseMessage } from "djs-message-commands";
import dotenv from "dotenv";
import assert from "node:assert/strict";
import ora from "ora";
import path from "path";

import {
    ButtonRegistry, CommandRegistry, EventRegistry, ModalRegistry, SelectMenuRegistry
} from "./registries";
import {
    BaseButtonContext, BaseContextMenuCommandContext, BaseMessageCommandContext, BaseModalContext,
    BaseSelectMenuContext, BaseSlashCommandContext
} from "./structures/context";
import { CommandArgResolver } from "./structures/interaction/command";
import { HyperionError } from "./util/HyperionError";
import { DefaultLogger, Logger } from "./util/Logger";

dotenv.config({
    path: path.join(process.cwd(), "./bot/.env"),
});

export class HyperionClient<DB = unknown> extends Client {
    public readonly logger: Logger;
    public readonly db: DB;
    public commands!: CommandRegistry;
    public buttons!: ButtonRegistry;
    public selectMenus!: SelectMenuRegistry;
    public modals!: ModalRegistry;
    public events!: EventRegistry;

    public constructor(public readonly options: HyperionClientOptions<DB>) {
        super(options);

        assert(
            process.env.DISCORD_APP_ID,
            chalk.redBright`You must specify a Discord application ID in your .env file.`
        );
        assert(
            process.env.DISCORD_TOKEN,
            chalk.redBright`You must specify a Discord application token in your .env file.`
        );

        this.options = options;
        this.db = options.database as any;
        this.logger = this.options.useDefaultLogger
            ? new DefaultLogger(undefined)
            : this.options.logger(undefined);
    }
}

export type HyperionClientOptions<DB = unknown> = ClientOptions &
    HyperionBaseClientOptions<DB> &
    LoggerOptions;

export type HyperionBaseClientOptions<DB> = {
    name: string;
    description: string;
    ownerIds: string[];
    devGuildIds?: string[];
    database?: DB;
    defaultPrefix: string;
    SlashCommandContext: new (...args: any[]) => BaseSlashCommandContext;
    ContextMenuCommandContext: new (...args: any[]) => BaseContextMenuCommandContext;
    ButtonContext: new (...args: any[]) => BaseButtonContext;
    SelectMenuContext: new (...args: any[]) => BaseSelectMenuContext;
    ModalContext: new (...args: any[]) => BaseModalContext;
    MessageCommandContext: new (...args: any[]) => BaseMessageCommandContext;
};

export type LoggerOptions =
    | { useDefaultLogger: false; logger: (channelId?: string) => Logger }
    | { useDefaultLogger: true };