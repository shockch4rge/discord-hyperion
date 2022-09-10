import assert from "assert";
import chalk from "chalk";
import { Client, ClientOptions, Snowflake } from "discord.js";
import dotenv from "dotenv";
import { Dirent } from "fs";
import ora from "ora";
import path from "path";
import _ from "radash";

import { ButtonRegistry, CommandRegistry, ModalRegistry, SelectMenuRegistry } from "./registries";
import {
    ButtonContext, ContextMenuCommandContext, ModalContext, SelectMenuContext, SlashCommandContext
} from "./structures/context";
import { CommandArgResolver } from "./structures/interaction/command";
import { HyperionError } from "./util/HyperionError";
import { DefaultLogger, Logger } from "./util/Logger";

dotenv.config({
    path: path.join(process.cwd(), "./bot/.env"),
});

export class HyperionClient extends Client {
    public readonly options: HyperionClientOptions;
    public readonly logger: Logger;
    public readonly commands: CommandRegistry;
    public readonly buttons: ButtonRegistry;
    public readonly selectMenus: SelectMenuRegistry;
    public readonly modals: ModalRegistry;
    private readonly database: unknown;

    public constructor(options: HyperionClientOptions) {
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
        this.commands = new CommandRegistry(this);
        this.buttons = new ButtonRegistry(this);
        this.selectMenus = new SelectMenuRegistry(this);
        this.modals = new ModalRegistry(this);
        this.database = options.database;
        this.logger = this.options.useDefaultLogger
            ? new DefaultLogger(undefined)
            : this.options.logger(undefined);
    }

    public db<DB = unknown>() {
        return this.database as DB;
    }

    public async start() {
        await this.commands.register();
        await this.buttons.register();
        await this.selectMenus.register();
        await this.modals.register();
        await this.registerEvents();

        const login = ora("Logging in...");
        await this.login(process.env.DISCORD_TOKEN);
        login.succeed(chalk.greenBright.bold`${this.options.name} is ready!`);
    }

    private async registerEvents() {
        this.on("ready", () => {});

        this.on("interactionCreate", async interaction => {
            if (interaction.isChatInputCommand()) {
                if (interaction.isCommand()) {
                    const command = this.commands.get(interaction.commandName);

                    if (!command) {
                        throw new HyperionError(e => e.CommandNotFound, interaction.commandName);
                    }

                    if (!command.isSlashCommand()) return;

                    await interaction.deferReply({
                        ephemeral: command.options.ephemeral ?? true,
                    });

                    const context = new SlashCommandContext(
                        this,
                        interaction,
                        new CommandArgResolver(interaction),
                        interaction.guild
                    );

                    if (command.hasSubcommands()) {
                        const subcommand = command.options.subcommands!.get(
                            context.args.subcommand(true)
                        );

                        if (!subcommand) {
                            throw new HyperionError(
                                e => e.SubcommandNotFound,
                                interaction.options.getSubcommand(true)
                            );
                        }

                        try {
                            await subcommand.slashRun(context);
                        } catch (e) {
                            this.logger.warn(
                                `'${command.options.name}-${subcommand.options.name}' failed to run.`
                            );
                        }

                        return;
                    }

                    for (const GuardFactory of command.options.guards ?? []) {
                        const guard = new GuardFactory();

                        try {
                            if (guard.slashRun) {
                                const passed = await guard.slashRun(context);
                                if (!passed) {
                                    await guard.onSlashFail!(context);
                                    return;
                                }
                            }

                            await interaction.editReply({
                                content: guard.options.message,
                            });
                        } catch (e) {}
                    }

                    try {
                        await command.slashRun?.(context);
                    } catch (e) {
                        console.log(e);

                        this.logger.warn(`'${command.options.name}' failed to run: ${e}`);
                    }

                    return;
                }

                return;
            }

            if (interaction.isContextMenuCommand()) {
                const command = this.commands.get(interaction.commandName);

                if (!command) {
                    throw new HyperionError(e => e.CommandNotFound, interaction.commandName);
                }

                if (
                    interaction.isUserContextMenuCommand() &&
                    command.options.contextMenuType === "client" &&
                    interaction.targetUser.id !== this.user!.id
                ) {
                    return;
                }

                const context = new ContextMenuCommandContext(interaction, this, interaction.guild);

                for (const GuardFactory of command.options.guards ?? []) {
                    const guard = new GuardFactory();

                    try {
                        if (guard.contextMenuRun) {
                            const passed = await guard.contextMenuRun(context);
                            if (!passed) {
                                await guard.contextMenuFail?.(context);
                                return;
                            }
                        }
                    } catch (e) {}
                }

                try {
                    await command.contextMenuRun?.(context);
                } catch (e) {
                    const err = e as Error;
                    this.logger.warn(
                        `Button '${command.options.name}' failed to run: ${err.stack}`
                    );
                }
            }

            if (interaction.isButton()) {
                await interaction.deferUpdate();
                const button = this.buttons.get(interaction.customId);

                if (!button) {
                    throw new HyperionError(e => e.ButtonNotFound, interaction.customId);
                }

                const context = new ButtonContext(this, interaction, interaction.guild);

                for (const GuardFactory of button.options.guards ?? []) {
                    const guard = new GuardFactory();

                    try {
                        if (guard.buttonRun) {
                            const passed = await guard.buttonRun(context);
                            if (!passed) {
                                await guard.buttonFail!(context);
                                return;
                            }
                        }

                        await context.update(guard.options.message);
                    } catch (e) {
                        // TODO:
                    }
                }

                try {
                    await button.run(context);
                } catch (e) {
                    const err = e as Error;
                    this.logger.warn(`Button '${button.options.id}' failed to run: ${err.stack}`);
                }

                return;
            }

            if (interaction.isSelectMenu()) {
                const selectMenu = this.selectMenus.get(interaction.customId);

                if (!selectMenu) {
                    throw new HyperionError(e => e.SelectMenuNotFound, interaction.customId);
                }

                const context = new SelectMenuContext(this, interaction, interaction.guild);

                for (const GuardFactory of selectMenu.options.guards ?? []) {
                    const guard = new GuardFactory();

                    try {
                        if (guard.selectMenuRun) {
                            const passed = await guard.selectMenuRun(context);
                            if (!passed) {
                                await guard.selectMenuFail!(context);
                                return;
                            }
                        }

                        await interaction.editReply({
                            content: guard.options.message,
                        });
                    } catch (e) {}
                }

                try {
                    await selectMenu.run(context);
                } catch (e) {
                    const err = e as Error;
                    this.logger.warn(
                        `Modal ${selectMenu.options.id} failed to submit: ${err.stack}`
                    );
                }

                return;
            }

            if (interaction.isModalSubmit()) {
                if (!interaction.isFromMessage()) return;

                const modal = this.modals.get(interaction.customId);

                if (!modal) {
                    throw new HyperionError(e => e.ModalNotFound, interaction.customId);
                }

                const context = new ModalContext(interaction, this, interaction.guild);

                try {
                    await modal.run(context);
                } catch (e) {}
            }
        });
    }
}

export interface HyperionCliens {
    logger: Logger;
}

export type HyperionClientOptions = ClientOptions &
    HyperionBaseClientOptions &
    RouteParsingOptions &
    LoggerOptions;

export type HyperionBaseClientOptions = {
    name: string;
    description: string;
    ownerIds: Snowflake[];
    devGuildIds?: Snowflake[];
    cleanLeftoverCommands?: boolean;
    database?: unknown;
};

export type LoggerOptions =
    | { useDefaultLogger: true }
    | { useDefaultLogger: false; logger: (channelId?: string) => Logger };

export type RouteParsingOptions = {
    routeParsing: DefaultRouteParsing | CustomRouteParsing;
};
export type DefaultRouteParsing = {
    type: "default";
};
export type CustomRouteParsing = {
    type: "custom";
    filter?: (file: Dirent) => boolean;
    directories: {
        baseDir?: string;
        commands?: string;
        buttons?: string;
        selectMenus?: string;
        modals?: string;
    };
};
