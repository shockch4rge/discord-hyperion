import { ApplicationCommand, Collection, REST, Routes } from "discord.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ora from "ora";
import path from "path";
import * as _ from "radash";

import { HyperionClient } from "../HyperionClient";
import { Command, Subcommand } from "../structures/interaction/command";
import { colorize } from "../util/colorize";
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
            colorize(
                c => c.redBright`A subcommand class was not exported at`,
                c => c.cyanBright(shortPath),
            )
        );
        assert(
            Subcommand.isPrototypeOf(SubcommandClass),
            colorize(
                c => c.redBright`Class at`,
                c => c.cyanBright(shortPath),
                c => c.redBright`must extend the Subcommand class!`,
            )
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
            text: colorize(c => c.cyanBright`Registering application commands...`),
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
                    colorize(
                        c => c.redBright`A parent command must be a folder that contains a file with the command's name and a 'subcommands' folder.`
                    )
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
                    colorize(c => c.redBright`A parent command cannot be a context menu command.`),
                );
                assert(
                    !parentCommand.options.args || parentCommand.options.args.length === 0,
                    colorize(c => c.redBright`A parent command cannot have arguments.`),
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
                colorize(
                    c => c.redBright("Command"),
                    c => c.cyanBright(`[${command.options.name}]`),
                    c => c.redBright("already exists."),
                )
            );

            for (const GuardFactory of command.options.guards ?? []) {
                const guard = new GuardFactory();

                if (command.isSlashCommand()) {
                    assert(
                        guard.slashRun,
                        colorize(
                            c => c.redBright("Guard"),
                            c => c.cyanBright(`[${guard.options.name}]`),
                            c => c.redBright("must have a"),
                            c => c.cyanBright("[slashRun]"),
                            c => c.redBright("method for command"),
                            c => c.cyanBright(`[${command.options.name}]`),
                            c => c.redBright("."),
                        )
                    );
                }

                if (command.isMessageCommand()) {
                    assert(
                        guard.messageRun,
                        colorize(
                            c => c.redBright("Guard"),
                            c => c.cyanBright(`[${guard.options.name}]`),
                            c => c.redBright("must have a"),
                            c => c.cyanBright("[messageRun]"),
                            c => c.redBright("method for command"),
                            c => c.cyanBright(`[${command.options.name}]`),
                            c => c.redBright("."),
                        )
                    );
                }

                if (command.isContextMenuCommand()) {
                    assert(
                        guard.contextMenuRun,
                        colorize(
                            c => c.redBright("Guard"),
                            c => c.cyanBright(`[${guard.options.name}]`),
                            c => c.redBright("must have a"),
                            c => c.cyanBright("[contextMenuRun]"),
                            c => c.redBright("method for command"),
                            c => c.cyanBright(`[${command.options.name}]`),
                            c => c.redBright("."),
                        )
                    );

                    assert(
                        command.options.contextMenuType,
                        colorize(
                            c => c.redBright`Context command ${command.options.name} must have a contextMenuType.`
                        ),
                    );
                }
            }

            this.set(command.options.name, command);
        }

        const slashCommands = this.filter(command => command.isSlashCommand());
        const cmCommands = this.filter(command => command.isContextMenuCommand());

        assert(
            slashCommands.size <= 100,
            colorize(
                c => c.redBright`You can only have 100 chat input commands per application.`
            )
        );
        assert(
            cmCommands.size <= 10,
            colorize(
                c => c.redBright.bold(cmCommands.size),
                c => c.redBright`/10 context menu commands registered.`,
            )
        );

        const [userCmCommands, messageCmCommands] = cmCommands
            .filter(c => !!c.options.contextMenuType)
            .partition(c => c.options.contextMenuType === "user");

        assert(
            userCmCommands.size <= 5,
            colorize(
                c => c.redBright.bold(userCmCommands.size),
                c => c.redBright("/5 user context menu commands registered.")
            )
        );
        assert(
            messageCmCommands.size <= 5,
            colorize(
                c => c.redBright.bold(messageCmCommands.size),
                c => c.redBright("/5 message context menu commands registered.")
            )
        );

        if (devGuildIds && devGuildIds.length > 0) {
            assert(
                process.env.NODE_ENV === "development",
                colorize(
                    c => c.redBright`You've specified guild IDs for development, but you're not in development mode. Make sure that the 'NODE_ENV' variable in your .env commandFile is set to 'development'.`
                ),
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
                colorize(
                    c => c.greenBright`Registered`,
                    c => c.greenBright.bold(slashCommands.size),
                    c => c.greenBright`slash ${slashCommands.size === 1 ? "command" : "commands"} and`,
                    c => c.greenBright.bold(cmCommands.size),
                    c => c.greenBright`context menu ${cmCommands.size === 1 ? "command" : "commands"} for`,
                    c => c.greenBright.bold(devGuildIds.length),
                    c => c.greenBright`development ${devGuildIds.length !== 1 ? "guilds" : "guild"}!`
                )
            );
            return;
        }

        assert(
            process.env.NODE_ENV === "production",
            colorize(
                c => c.redBright`You're not in production mode. Make sure that NODE_ENV in .env is set to 'production', OR add guild IDs in Hyperion's options.`
            )
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
            text: colorize(c => c.cyanBright`Registering message commands...`),
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
            text: colorize(c => c.cyanBright`Cleaning guild application commands...`),
        });

        for (const guildId of guildIds) {
            const [err, commands] = await _.try(() =>
                this.rest.get(Routes.applicationGuildCommands(process.env.DISCORD_APP_ID!, guildId))
            )();

            if (err) {
                spinner.fail(
                    colorize(c => c.redBright`Failed to get commands in guild ID [${guildId}].`)
                );
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
                        colorize(c => c.redBright`Failed to delete command`, 
                            c => c.redBright.bold`[${command.name}]`,
                            c => c.redBright`in guild ID [${guildId}].`
                        ),
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