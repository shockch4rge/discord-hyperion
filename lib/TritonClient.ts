import assert from "assert";
import chalk from "chalk";
import { Client, ClientOptions, Collection, REST, Routes, Snowflake } from "discord.js";
import dotenv from "dotenv";
import fs from "fs/promises";
import ora from "ora";
import path from "path";
import _ from "radash";

import { ButtonContext, SlashCommandContext } from "./structures/context";
import { SelectMenuContext } from "./structures/context/SelectMenuContext";
import { Command } from "./structures/interaction/command";
import { CommandArgResolver } from "./structures/interaction/command/Command";
import { Button, SelectMenu } from "./structures/interaction/component";
import { DefaultLogger, Logger } from "./util/Logger";
import { TritonError } from "./util/TritonError";
import { Constructor } from "./util/types";

dotenv.config({
    path: path.join(process.cwd(), "./bot/.env"),
});

__dirname = path.join(process.cwd(), "./bot/src");

export class TritonClient extends Client {
    public readonly options: TritonClientOptions;
    public readonly util: TritonClientUtils;
    public readonly commands: Collection<string, Command>;
    public readonly buttons: Collection<string, Button>;
    public readonly selectMenus: Collection<string, SelectMenu>;

    public constructor(options: TritonClientOptions) {
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
        this.commands = new Collection();
        this.buttons = new Collection();
        this.selectMenus = new Collection();
        this.util = {
            logger: this.options.useDefaultLogger
                ? new DefaultLogger(undefined)
                : this.options.logger(undefined),
        };
    }

    public async start() {
        await this.registerCommands();
        await this.registerButtons();
        await this.registerSelectMenus();
        await this.registerEvents();

        const login = ora("Logging in...");
        await this.login(process.env.DISCORD_TOKEN);
        login.succeed(chalk.greenBright.bold`${this.options.name} is ready!`);
    }

    private async import<T>(file: string) {
        // commonjs 'dynamic imports' return an object
        const Class = Object.values((await import(file)) as Record<string, Constructor<T>>)[0];
        return new Class();
    }

    private async registerEvents() {
        this.on("ready", () => {});

        this.on("interactionCreate", async interaction => {
            if (interaction.isChatInputCommand()) {
                if (interaction.isCommand()) {
                    const command = this.commands.get(interaction.commandName);

                    if (!command) {
                        throw new TritonError(e => e.CommandNotFound, interaction.commandName);
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

                    await command.slashRun?.(context);
                }

                return;
            }

            if (interaction.isButton()) {
                const button = this.buttons.get(interaction.customId);

                if (!button) {
                    throw new TritonError(e => e.ButtonNotFound, interaction.customId);
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

                        await interaction.editReply({
                            content: guard.options.message,
                        });
                    } catch (e) {
                        // TODO:
                    }
                }

                try {
                    await button.run(context);
                } catch (e) {
                    // TODO:
                }

                return;
            }

            if (interaction.isSelectMenu()) {
                const selectMenu = this.selectMenus.get(interaction.customId);

                if (!selectMenu) {
                    throw new TritonError(e => e.SelectMenuNotFound, interaction.customId);
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
                } catch (e) {}
            }
        });

        this.on("messageCreate", async message => {
            if (message.author.bot) return;
        });
    }

    private async registerCommands() {
        const spinner = ora({
            text: chalk.cyanBright`Registering commands...`,
        }).start();

        const routeParsing = this.options.routeParsing;
        let folderPath: string | undefined;

        if (routeParsing.type === "default") {
            folderPath = path.join(__dirname, `./interactions/commands`);
        } else {
            folderPath = `${routeParsing.directories.baseDir}/${routeParsing.directories.commands}`;

            if (!folderPath) {
                spinner.stopAndPersist({
                    text: chalk.yellow`No 'commands' directory specified. Skipping for now.`,
                    prefixText: "❓",
                });
                return;
            }
        }

        const fileNames = await fs.readdir(folderPath!);

        const defaultFilter = (fileName: string) =>
            fileName.endsWith(".ts") || fileName.endsWith(".js");

        const isFile =
            routeParsing.type === "custom" ? routeParsing.filter ?? defaultFilter : defaultFilter;

        for (const file of fileNames) {
            if (!isFile(file)) continue;

            const route = path.join(folderPath, file);
            const command = await this.import<Command>(route);

            for (const GuardFactory of command.options.guards ?? []) {
                const guard = new GuardFactory();

                if (command.isSlashCommand()) {
                    assert(
                        guard.slashRun,
                        `${chalk.redBright("Guard ")}${chalk.cyanBright(
                            `'${guard.options.name}'`
                        )}${chalk.redBright(" must have a ")}${chalk.cyanBright(
                            "'slashRun'"
                        )}${chalk.redBright(" method for command ")}${chalk.cyanBright(
                            `'${command.options.name}'`
                        )}${chalk.redBright(".")}`
                    );
                }

                if (command.isMessageCommand()) {
                    assert(
                        guard.messageRun,
                        `${chalk.redBright("Guard ")}${chalk.cyanBright(
                            `'${guard.options.name}'`
                        )}${chalk.redBright(" must have a ")}${chalk.cyanBright(
                            "'messageRun'"
                        )}${chalk.redBright(" method for command ")}${chalk.cyanBright(
                            `'${command.options.name}'`
                        )}${chalk.redBright(".")}`
                    );
                }
            }

            this.commands.set(command.options.name, command);
        }

        const rest = new REST({
            version: "10",
        }).setToken(process.env.DISCORD_TOKEN!);

        const devGuildIds = this.options.devGuildIds;

        if (devGuildIds && devGuildIds.length > 0) {
            assert(
                process.env.NODE_ENV === "development",
                chalk.redBright`You've specified guild IDs for development, but you're not in development mode. Make sure that the 'NODE_ENV' variable in your .env file is set to 'development'.`
            );

            for (const [index, guildId] of devGuildIds.entries()) {
                const route = Routes.applicationGuildCommands(process.env.DISCORD_APP_ID!, guildId);
                await rest.put(route, {
                    body: [
                        ...this.commands
                            .filter(c => c.isSlashCommand())
                            .map(c => c.buildSlash().toJSON()),
                    ],
                });
                spinner.text = `Registering commands in ${guildId}... (${index + 1}/${
                    devGuildIds.length
                })`;
            }

            spinner.succeed(
                chalk.green`Registered ${chalk.greenBright.bold(
                    this.commands.size
                )} commands for ${chalk.greenBright.bold(devGuildIds.length)} development ${
                    devGuildIds.length !== 1 ? "guilds" : "guild"
                }!`
            );
            return;
        }

        assert(
            process.env.NODE_ENV === "production",
            chalk.redBright`You're not in production mode. Make sure that NODE_ENV in .env is set to 'production', OR add guild IDs in Triton's options.`
        );

        const route = Routes.applicationCommands(process.env.DISCORD_APP_ID!);

        await rest.put(route, {
            body: [
                ...this.commands
                    .filter(c => c.isSlashCommand())
                    .map(command => command.buildSlash().toJSON()),
            ],
        });

        spinner.succeed(`Registered global commands!`);
    }

    private async registerButtons() {
        const spinner = ora({
            text: chalk.cyanBright`Registering buttons...`,
        }).start();

        const routeParsing = this.options.routeParsing;
        let folderPath: string | undefined;

        if (routeParsing.type === "default") {
            folderPath = path.join(__dirname, `./interactions/buttons`);
        } else {
            folderPath = `${routeParsing.directories.baseDir}/${routeParsing.directories.buttons}`;

            if (!folderPath) {
                spinner.stopAndPersist({
                    text: chalk.yellow`No 'buttons' directory specified. Skipping for now.`,
                    prefixText: "❓",
                });
                return;
            }
        }

        const fileNames = await fs.readdir(folderPath!);

        const defaultFilter = (fileName: string) =>
            fileName.endsWith(".ts") || fileName.endsWith(".js");

        const isFile =
            routeParsing.type === "custom" ? routeParsing.filter ?? defaultFilter : defaultFilter;

        for (const file of fileNames) {
            if (!isFile(file)) continue;

            const route = path.join(folderPath, file);
            const button = await this.import<Button>(route);

            for (const GuardFactory of button.options.guards ?? []) {
                const guard = new GuardFactory();

                assert(
                    guard.buttonRun,
                    `${chalk.redBright("Guard ")}${chalk.cyanBright(
                        `'${guard.options.name}'`
                    )}${chalk.redBright(" must have a ")}${chalk.cyanBright(
                        "'buttonRun'"
                    )}${chalk.redBright(" method for button ")}${chalk.cyanBright(
                        `'${button.options.id}'`
                    )}${chalk.redBright(".")}`
                );
            }

            this.buttons.set(button.options.id, button);
        }

        spinner.succeed(
            chalk.green`Registered ${chalk.greenBright.bold(this.buttons.size)} buttons!`
        );
    }

    private async registerSelectMenus() {
        const spinner = ora({
            text: chalk.cyanBright`Registering select menus...`,
        }).start();

        const routeParsing = this.options.routeParsing;
        let folderPath: string | undefined;

        if (routeParsing.type === "default") {
            folderPath = path.join(__dirname, `./interactions/select-menus`);
        } else {
            folderPath = `${routeParsing.directories.baseDir}/${routeParsing.directories.selectMenus}`;

            if (!folderPath) {
                spinner.stopAndPersist({
                    text: chalk.yellow`No 'select-menus' directory specified. Skipping for now.`,
                    prefixText: "❓",
                });
                return;
            }
        }

        const fileNames = await fs.readdir(folderPath!);

        const defaultFilter = (fileName: string) =>
            fileName.endsWith(".ts") || fileName.endsWith(".js");

        const isFile =
            routeParsing.type === "custom" ? routeParsing.filter ?? defaultFilter : defaultFilter;

        for (const file of fileNames) {
            if (!isFile(file)) continue;

            const route = path.join(folderPath, file);
            const selectMenu = await this.import<SelectMenu>(route);

            for (const GuardFactory of selectMenu.options.guards ?? []) {
                const guard = new GuardFactory();

                assert(
                    guard.selectMenuRun,
                    `${chalk.redBright("Guard ")}${chalk.cyanBright(
                        `'${guard.options.name}'`
                    )}${chalk.redBright(" must have a ")}${chalk.cyanBright(
                        "'selectMenuRun'"
                    )}${chalk.redBright(" method for select menu ")}${chalk.cyanBright(
                        `'${selectMenu.options.id}'`
                    )}${chalk.redBright(".")}`
                );
            }

            this.selectMenus.set(selectMenu.options.id, selectMenu);
        }

        spinner.succeed(
            chalk.green`Registered ${chalk.greenBright.bold(this.selectMenus.size)} select ${
                this.selectMenus.size !== 1 ? "menus" : "menu"
            }!`
        );
    }
}

export interface TritonClientUtils {
    logger: Logger;
}

export type TritonClientOptions = ClientOptions &
    TritonBaseClientOptions &
    RouteParsingOptions &
    LoggerOptions;

export type TritonBaseClientOptions = {
    name: string;
    description: string;
    ownerIds: Snowflake[];
    devGuildIds?: Snowflake[];
};

export type LoggerOptions =
    | {
          useDefaultLogger: true;
      }
    | {
          useDefaultLogger: false;
          logger: (channelId?: string) => Logger;
      };

export type RouteParsingOptions = {
    routeParsing: DefaultRouteParsing | CustomRouteParsing;
};

export type DefaultRouteParsing = { type: "default" };
export type CustomRouteParsing = {
    type: "custom";
    filter?: (fileName: string) => boolean;
    directories: {
        baseDir?: string;
        commands?: string;
        buttons?: string;
        selectMenus?: string;
        modals?: string;
    };
};
