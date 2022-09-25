import chalk from "chalk";
import { Client, ClientOptions, Snowflake } from "discord.js";
import dotenv from "dotenv";
import { Dirent } from "fs";
import assert from "node:assert/strict";
import ora from "ora";
import path from "path";

import {
    ButtonRegistry, CommandRegistry, EventRegistry, ModalRegistry, SelectMenuRegistry
} from "./registries";
import {
    ButtonContext, ContextMenuCommandContext, ModalContext, SelectMenuContext, SlashCommandContext
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

    public async start() {
        assert(this.commands, chalk.redBright`CommandRegistry not initialized.`);
        assert(this.buttons, chalk.redBright`ButtonRegistry not initialized.`);
        assert(this.selectMenus, chalk.redBright`SelectMenuRegistry not initialized.`);
        assert(this.modals, chalk.redBright`ModalRegistry not initialized.`);
        assert(this.events, chalk.redBright`EventRegistry not initialized.`);

        await this.commands.register();
        await this.buttons.register();
        await this.selectMenus.register();
        await this.modals.register();
        await this.events.register();
        await this.setupDefaultEvents();

        const login = ora("Logging in...");
        await this.login(process.env.DISCORD_TOKEN);
        login.succeed(chalk.greenBright.bold`${this.options.name} is ready!`);
    }

    private async setupDefaultEvents() {
        this.on("ready", () => { });

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
                        const subcommandName = interaction.options.getSubcommand();
                        const subcommand = command.options.subcommands!.get(subcommandName);

                        if (!subcommand) {
                            throw new HyperionError(e => e.SubcommandNotFound, subcommandName);
                        }

                        try {
                            await subcommand.run(context);
                        }
                        catch (e) {
                            const error = e as Error;
                            this.logger.warn(error.message);
                            this.logger.warn(
                                `'${command.options.name}-${subcommand.options.name}' failed to run.`
                            );
                            return;
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
                            return;
                        }
                        catch (e) {
                            const error = e as Error;
                            this.logger.warn(error.message);
                            this.logger.warn(`'${command.options.name}' failed to run.`);
                            return;
                        }
                    }

                    try {
                        await command.slashRun?.(context);
                    }
                    catch (e) {
                        const error = e as Error;
                        this.logger.warn(error.message);
                        this.logger.warn(`'${command.options.name}' failed to run: ${error}`);
                        return;
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

                            await interaction.editReply({
                                content: guard.options.message,
                            });
                            return;
                        }
                    }
                    catch (e) {
                        const error = e as Error;
                        this.logger.warn(error.message);
                        this.logger.warn(`'${command.options.name}' failed to run.`);
                        return;
                    }
                }

                try {
                    await command.contextMenuRun?.(context);
                }
                catch (e) {
                    const err = e as Error;
                    this.logger.warn(
                        `Button '${command.options.name}' failed to run: ${err.stack}`
                    );
                    return;
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

                            await interaction.editReply({
                                content: guard.options.message,
                            });
                            return;
                        }

                        await context.update(guard.options.message);
                    }
                    catch (e) {
                        const error = e as Error;
                        this.logger.warn(error.message);
                        this.logger.warn(`'${button.options.id}' failed to run.`);
                        return;
                    }
                }

                try {
                    await button.run(context);
                }
                catch (e) {
                    const err = e as Error;
                    this.logger.warn(`Button '${button.options.id}' failed to run: ${err.stack}`);
                    return;
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
                        return;
                    }
                    catch (e) {
                        const error = e as Error;
                        this.logger.warn(error.message);
                        this.logger.warn(`'${selectMenu.options.id}' failed to run.`);
                        return;
                    }
                }

                try {
                    await selectMenu.run(context);
                }
                catch (e) {
                    const err = e as Error;
                    this.logger.warn(
                        `Modal ${selectMenu.options.id} failed to submit: ${err.stack}`
                    );
                    return;
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
                }
                catch (e) {
                    const error = e as Error;
                    this.logger.warn(error.message);
                    this.logger.warn(`Modal ${modal.options.id} failed to submit: ${error.stack}`);
                }
            }
        });
    }
}

export type HyperionClientOptions<DB = unknown> = ClientOptions &
    HyperionBaseClientOptions<DB> &
    LoggerOptions;

export type HyperionBaseClientOptions<DB> = {
    name: string;
    description: string;
    ownerIds: Snowflake[];
    devGuildIds?: Snowflake[];
    database?: DB;
    defaultPrefix: RegExp | string;
};

export type LoggerOptions =
    | { useDefaultLogger: false; logger: (channelId?: string) => Logger }
    | { useDefaultLogger: true };