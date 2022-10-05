import chalk from "chalk";
import { ApplicationCommand, Collection, REST, Routes } from "discord.js";
import assert from "node:assert/strict";
import { Dirent } from "node:fs";
import fs from "node:fs/promises";
import ora from "ora";
import path from "path";
import * as _ from "radash";

import { HyperionClient } from "../HyperionClient";
import { Command, Subcommand } from "../structures/interaction/command";
import { HyperionError } from "../util/HyperionError";
import { isConstructor } from "../util/types";
import { Registry } from "./Registry";

export class CommandRegistry extends Registry<Command> {
    public readonly rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);
    private readonly messageCommands = new Collection<string, Command>();

    public constructor(client: HyperionClient, public readonly options: CommandRegistryOptions) {
        super(client);
    }

    private async importSubcommand(command: Command, path: string) {
        const [SubcommandClass] = Object.values(
            (await import(path)) as Record<string, new (command: Command) => Subcommand>
        );

        const shortPath = path
            .match(/(?<=src).*/)?.[0]
            .replaceAll(/\\/g, "/")
            .replace(/^/, "....") ?? path;

        assert(
            isConstructor(SubcommandClass),
            chalk.redBright`A subcommand class was not exported at ${chalk.cyanBright(shortPath)}`
        );
        assert(
            Subcommand.isPrototypeOf(SubcommandClass),
            chalk.redBright`Class at ${shortPath} must extend the Subcommand class!`
        );

        return new SubcommandClass(command);
    }

    public async register() {
        const devGuildIds = this.client.options.devGuildIds;
        const shouldCleanLeftoverCommands = this.options.cleanLeftover ?? false;

        if (shouldCleanLeftoverCommands) {
            await this.cleanGuildCommands(devGuildIds ?? []);
        }

        const spinner = ora({
            text: chalk.cyanBright`Registering application commands...`,
        }).start();

        const dirPath = path.join(this.importPath, `./interactions/commands`);
        const commandDir = await fs.readdir(dirPath, { withFileTypes: true });

        for (const commandFile of commandDir) {
            // is subcommand
            if (commandFile.isDirectory()) {
                const parentCommandDir = await fs.readdir(path.join(dirPath, commandFile.name), {
                    withFileTypes: true,
                });

                const subcommandDirs = parentCommandDir.filter(f => f.isDirectory());
                const parentCommandFile = parentCommandDir.find(f => f.isFile());

                assert(
                    parentCommandDir.length === 2 &&
                    subcommandDirs.length === 1 &&
                    parentCommandFile &&
                    this.isValidFile(parentCommandFile) &&
                    subcommandDirs[0].name === "subcommands",
                    chalk.redBright`A command with subcommands must be a folder that holds both a file with the same name, and a folder named 'subcommands'.`
                );

                const parentCommand = await this.import<Command>(
                    path.join(
                        dirPath,
                        commandFile.name,
                        parentCommandFile.name
                    )
                );

                assert(
                    !parentCommand.isContextMenuCommand(),
                    chalk.redBright`A parentCommand with subcommands cannot be a context menu command.`
                );
                assert(
                    !parentCommand.options.args || parentCommand.options.args.length === 0,
                    chalk.redBright`A command with subcommands cannot have arguments.`
                );

                const subcommandDir = await fs.readdir(
                    path.join(
                        dirPath,
                        commandFile.name,
                        parentCommandDir.find(f => f.isDirectory())!.name
                    ),
                    { withFileTypes: true }
                );

                // import all subcommands in the folder and map into a collection
                const subcommands = (
                    await Promise.all(subcommandDir
                        .filter(d => this.isValidFile(d))
                        .map(subcommandFile => this.importSubcommand(
                            parentCommand,
                            path.join(dirPath, commandFile.name, "subcommands", subcommandFile.name)
                        ))
                    )
                ).reduce(
                    (coll, sc) => coll.set(sc.options.name, sc),
                    new Collection<string, Subcommand>()
                );

                Reflect.set(parentCommand.options, "subcommands", subcommands);
                this.set(parentCommand.options.name, parentCommand);
                continue;
            }

            if (!this.isValidFile(commandFile)) continue;

            const route = path.join(dirPath, commandFile.name);
            const command = await this.import<Command>(route);

            assert(
                !this.has(command.options.name),
                chalk.redBright`Command '${command.options.name}' already exists.`
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
        const cmCommands = this.filter(command => command.isContextMenuCommand());

        assert(
            slashCommands.size <= 100,
            chalk.redBright`You can only have 100 chat input commands per application.`
        );
        assert(
            cmCommands.size <= 10,
            `${chalk.redBright
                .bold`${cmCommands.size}`}${chalk.redBright`/10 context menu commands registered.`}`
        );

        const [userCmCommands, messageCmCommands] = cmCommands
            .filter(c => !!c.options.contextMenuType)
            .partition(c => c.options.contextMenuType === "user");

        assert(
            userCmCommands.size <= 5,
            `${chalk.redBright
                .bold`${userCmCommands.size}`}${chalk.redBright`/5 user context menu commands registered.`}`
        );
        assert(
            messageCmCommands.size <= 5,
            `${chalk.redBright
                .bold`${messageCmCommands.size}`}${chalk.redBright`/5 message context menu commands registered.`}`
        );

        if (devGuildIds && devGuildIds.length > 0) {
            assert(
                process.env.NODE_ENV === "development",
                chalk.redBright`You've specified guild IDs for development, but you're not in development mode. Make sure that the 'NODE_ENV' variable in your .env commandFile is set to 'development'.`
            );

            for (const [index, guildId] of devGuildIds.entries()) {
                const route = Routes.applicationGuildCommands(process.env.DISCORD_APP_ID!, guildId);
                await this.rest.put(route, {
                    body: [
                        ...slashCommands.map(command => command.buildSlash().toJSON()),
                        // ...cmCommands.map(command => command.buildContextMenu().toJSON()),
                    ],
                });
                spinner.text = `Registering commands in ${guildId}... (${index + 1}/${devGuildIds.length})`;
            }

            spinner.succeed(
                chalk.green`Registered ${chalk.greenBright.bold(slashCommands.size)} slash ${slashCommands.size === 1 ? "command" : "commands"} and ${chalk.greenBright.bold(cmCommands.size)} context menu ${cmCommands.size === 1 ? "command" : "commands"} for ${chalk.greenBright.bold(devGuildIds.length)} development ${devGuildIds.length !== 1 ? "guilds" : "guild"}!`
            );
            return;
        }

        assert(
            process.env.NODE_ENV === "production",
            chalk.redBright`You're not in production mode. Make sure that NODE_ENV in .env is set to 'production', OR add guild IDs in Hyperion's options.`
        );

        const route = Routes.applicationCommands(process.env.DISCORD_APP_ID!);

        await this.rest.put(route, {
            body: [
                ...slashCommands.map(command => command.buildSlash().toJSON()),
                // ...cmCommands.map(command => command.buildContextMenu().toJSON()),
            ],
        });

        spinner.succeed(`Registered global application commands!`);

        this.registerMessageCommands();
    }

    public getMessageCommand(name: string) {
        return this.messageCommands.get(name)
            ?? this.messageCommands.find(cmd => !!cmd.options.aliases?.includes(name));
    }

    private registerMessageCommands() {
        const spinner = ora({
            text: chalk.cyanBright`Registering message commands...`,
        }).start();

        for (const [name, cmd] of this.filter(cmd => cmd.isMessageCommand())) {
            Reflect.set(cmd, "builder", cmd.buildMessage());

            this.messageCommands.set(name, cmd);

            if (!cmd.options.aliases) continue;

            for (const alias of cmd.options.aliases) {
                if (this.messageCommands.has(alias)) {
                    spinner.fail();
                    throw new HyperionError(e => e.DuplicateMessageCommandAlias, name, alias);
                }

                this.messageCommands.set(alias, cmd);
            }
        }

        spinner.succeed(`Registered ${this.messageCommands.size} message commands!`);
    }

    private async cleanGuildCommands(guildIds: string[]) {
        const spinner = ora({
            text: chalk.cyanBright`Cleaning guild application commands...`,
        });

        for (const guildId of guildIds) {
            const [err, commands] = await _.try(() =>
                this.rest.get(Routes.applicationGuildCommands(process.env.DISCORD_APP_ID!, guildId))
            )();

            if (err) {
                spinner.fail(chalk.redBright`Failed to get commands in guild ID [${guildId}].`);
                console.error(err);
                continue;
            }

            for (const command of commands as ApplicationCommand[]) {
                const [err] = await _.try(() =>
                    this.rest.delete(
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

    }
}

export type CommandRegistryOptions = {
    cleanLeftover?: boolean;
};