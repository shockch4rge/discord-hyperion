import assert from "assert";
import chalk from "chalk";
import { Client, ClientOptions, Snowflake } from "discord.js";
import dotenv from "dotenv";
import ora from "ora";
import path from "path";
import _ from "radash";

import { ButtonRegistry, CommandRegistry, SelectMenuRegistry } from "./registries";
import { ButtonContext, SlashCommandContext } from "./structures/context";
import { SelectMenuContext } from "./structures/context/SelectMenuContext";
import { CommandArgResolver } from "./structures/interaction/command/Command";
import { DefaultLogger, Logger } from "./util/Logger";
import { TritonError } from "./util/TritonError";

dotenv.config({
    path: path.join(process.cwd(), "./bot/.env"),
});

export class TritonClient extends Client {
    public readonly options: TritonClientOptions;
    public readonly util: TritonClientUtils;
    public readonly commands: CommandRegistry;
    public readonly buttons: ButtonRegistry;
    public readonly selectMenus: SelectMenuRegistry;

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
        this.commands = new CommandRegistry(this);
        this.buttons = new ButtonRegistry(this);
        this.selectMenus = new SelectMenuRegistry(this);
        this.util = {
            logger: this.options.useDefaultLogger
                ? new DefaultLogger(undefined)
                : this.options.logger(undefined),
        };
    }

    public async start() {
        await this.commands.register();
        await this.buttons.register();
        await this.selectMenus.register();
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
