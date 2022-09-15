import chalk from "chalk";
import { ApplicationCommand, Collection, REST, Routes } from "discord.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ora from "ora";
import path from "path";
import * as _ from "radash";

import { Command, Subcommand } from "../structures/interaction/command";
import { HyperionError } from "../util/HyperionError";
import { isConstructor } from "../util/types";
import { Registry } from "./Registry";

export class CommandRegistry extends Registry<Command> {
    private async importSubcommand(command: Command, path: string) {
        const [Class] = Object.values(
    		(await import(path)) as Record<string, new (command: Command) => Subcommand>
        );
        const shortPath = path.match(/(?<=src).*/)?.[0].replaceAll(/\\/g, "/").replace(/^/, "....") ?? path;

        assert(
            isConstructor(Class),
            chalk.redBright`A subcommand class was not exported at ${chalk.cyanBright(shortPath)}`
        );
        assert(
            Subcommand.isPrototypeOf(Class),
            chalk.redBright`Object at ${path} must extend the Subcommand class!`
        );

        return new Class(command);
    }

    public async register() {
        const devGuildIds = this.client.options.devGuildIds;
        const shouldCleanLeftoverCommands = this.client.options.cleanLeftoverCommands ?? false;

        const spinner = ora({
            text: chalk.cyanBright`${
                shouldCleanLeftoverCommands
                    ? "Cleaning removed commands..."
                    : "Registering commands..."
            }`,
        }).start();

        const rest = new REST({
            version: "10",
        }).setToken(process.env.DISCORD_TOKEN!);

        if (shouldCleanLeftoverCommands) {
            for (const guildId of devGuildIds ?? []) {
                const [err, commands] = await _.try(() =>
                    rest.get(Routes.applicationGuildCommands(process.env.DISCORD_APP_ID!, guildId))
                )();

                if (err) {
                    spinner.fail(chalk.redBright`Failed to get commands in guild ID [${guildId}].`);
                    console.log(err);

                    continue;
                }

                for (const command of commands as ApplicationCommand[]) {
                    const [err] = await _.try(() =>
                        rest.delete(
                            Routes.applicationGuildCommand(
                                process.env.DISCORD_APP_ID!,
                                guildId,
                                command.id
                            )
                        )
                    )();

                    if (err) {
                        spinner.fail(
                            chalk.redBright`Failed to delete command '${command.name}' in guild ID [${guildId}].`
                        );
                        throw new HyperionError(e => e.DeleteGuildCommandsFail, guildId);
                    }
                }
            }

            spinner.text = chalk.cyanBright`Registering commands...`;
        }

        const routeParsing = this.client.options.routeParsing;
        let folderPath: string;

        if (routeParsing.type === "default") {
            folderPath = path.join(this.importPath, `./interactions/commands`);
        }
        else {
            const baseDir = routeParsing.directories.baseDir;
            const commandDir = routeParsing.directories.commands;

            if (!baseDir || !commandDir) {
                spinner.stopAndPersist({
                    text: chalk.yellow`No 'commands' directory specified. Skipping for now.`,
                    prefixText: "❓",
                });
                return;
            }

            folderPath = `${baseDir}/${commandDir}`;
        }

        const commandFolder = await fs.readdir(folderPath, { withFileTypes: true });

        for (const file of commandFolder) {
            // is subcommand
            if (file.isDirectory()) {
                const parentCommandFolder = await fs.readdir(path.join(folderPath, file.name), {
                    withFileTypes: true,
                });

                assert(
                    parentCommandFolder.length === 2 &&
                        parentCommandFolder.filter(f => !f.isDirectory()).length === 1 &&
                        parentCommandFolder.filter(f => f.isDirectory()).length === 1,
                    "A command with subcommands must have a single file and a folder."
                );

                const parentCommand = await this.import<Command>(
                    path.join(
                        folderPath,
                        file.name,
                        parentCommandFolder.find(f => !f.isDirectory())!.name
                    )
                );

                assert(
                    !parentCommand.isContextMenuCommand(),
                    "A parentCommand with subcommands cannot be a context menu command."
                );
                assert(
                    !parentCommand.options.args || parentCommand.options.args.length === 0,
                    chalk.redBright`A command with subcommands cannot have arguments.`
                );

                const subcommandFolder = await fs.readdir(
                    path.join(
                        folderPath,
                        file.name,
                        parentCommandFolder.find(f => f.isDirectory())!.name
                    ),
                    { withFileTypes: true }
                );

                // import all subcommands in its folder and register each one into a collection
                const subcommands = (
                    await Promise.all(
                        subcommandFolder
                            .filter(d => this.isValidFile(d))
                            .map(d =>
                                this.importSubcommand(
                                    parentCommand,
                                    path.join(folderPath, file.name, "subcommands", d.name)
                                )
                            )
                    )
                ).reduce(
                    (coll, sc) => coll.set(sc.options.name, sc),
                    new Collection<string, Subcommand>()
                );

                parentCommand.options.subcommands = subcommands;
                this.set(parentCommand.options.name, parentCommand);
                continue;
            }

            if (!this.isValidFile(file)) continue;

            const route = path.join(folderPath, file.name);
            const command = await this.import<Command>(route);

            assert(
                !this.has(command.options.name),
                `Command '${command.options.name}' already exists.`
            );

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

                if (command.isContextMenuCommand()) {
                    assert(
                        guard.contextMenuRun,
                        `${chalk.redBright("Guard ")}${chalk.cyanBright(
                            `'${guard.options.name}'`
                        )}${chalk.redBright(" must have a ")}${chalk.cyanBright(
                            "'contextMenuRun'"
                        )}${chalk.redBright(" method for command ")}${chalk.cyanBright(
                            `'${command.options.name}'`
                        )}${chalk.redBright(".")}`
                    );

                    assert(
                        command.options.contextMenuType,
                        chalk.redBright`Context command ${command.options.name} must have a contextMenuType.`
                    );
                }
            }

            this.set(command.options.name, command);
        }

        const slashCommands = this.filter(command => command.isSlashCommand());
        const contextMenuCommands = this.filter(command => command.isContextMenuCommand());

        assert(
            slashCommands.size <= 100,
            chalk.redBright`You can only have 100 chat input commands per application.`
        );
        assert(
            contextMenuCommands.size <= 10,
            `${chalk.redBright
                .bold`${contextMenuCommands.size}`}${chalk.redBright`/10 context menu commands registered.`}`
        );

        const userContextMenuCommands = contextMenuCommands.filter(
            c => c.options.contextMenuType === "user" || c.options.contextMenuType === "client"
        );
        const messageContextMenuCommands = contextMenuCommands.filter(
            c => c.options.contextMenuType === "message"
        );

        assert(
            userContextMenuCommands.size <= 5,
            `${chalk.redBright
                .bold`${userContextMenuCommands.size}`}${chalk.redBright`/5 user context menu commands registered.`}`
        );
        assert(
            messageContextMenuCommands.size <= 5,
            `${chalk.redBright
                .bold`${messageContextMenuCommands.size}`}${chalk.redBright`/5 message context menu commands registered.`}`
        );

        if (devGuildIds && devGuildIds.length > 0) {
            assert(
                process.env.NODE_ENV === "development",
                chalk.redBright`You've specified guild IDs for development, but you're not in development mode. Make sure that the 'NODE_ENV' variable in your .env file is set to 'development'.`
            );

            for (const [index, guildId] of devGuildIds.entries()) {
                const route = Routes.applicationGuildCommands(process.env.DISCORD_APP_ID!, guildId);
                await rest.put(route, {
                    body: [
                        ...slashCommands.map(command => command.buildSlash().toJSON()),
                        ...contextMenuCommands.map(command => command.buildContextMenu().toJSON()),
                    ],
                });
                spinner.text = `Registering commands in ${guildId}... (${index + 1}/${
                    devGuildIds.length
                })`;
            }

            spinner.succeed(
                chalk.green`Registered ${chalk.greenBright.bold(slashCommands.size)} slash ${
                    slashCommands.size === 1 ? "command" : "commands"
                } and ${chalk.greenBright.bold(contextMenuCommands.size)} context menu ${
                    contextMenuCommands.size === 1 ? "command" : "commands"
                } for ${chalk.greenBright.bold(devGuildIds.length)} development ${
                    devGuildIds.length !== 1 ? "guilds" : "guild"
                }!`
            );
            return;
        }

        assert(
            process.env.NODE_ENV === "production",
            chalk.redBright`You're not in production mode. Make sure that NODE_ENV in .env is set to 'production', OR add guild IDs in Hyperion's options.`
        );

        const route = Routes.applicationCommands(process.env.DISCORD_APP_ID!);

        await rest.put(route, {
            body: [
                ...slashCommands.map(command => command.buildSlash().toJSON()),
                ...contextMenuCommands.map(command => command.buildContextMenu().toJSON()),
            ],
        });

        spinner.succeed(`Registered global commands!`);
    }
}
