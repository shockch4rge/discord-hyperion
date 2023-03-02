import { Registry } from "./Registry";
import type { Command, ConcreteSubcommandConstructor } from "../structs";
import { Subcommand } from "../structs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { color, HyperionError, isConstructor } from "../utils";
import type { ApplicationCommand } from "discord.js";
import { Collection, REST, Routes } from "discord.js";
import ora from "ora";
import type { Dirent } from "fs";
import { tryit } from "radash";

export class CommandRegistry extends Registry<string, Command> {
    public readonly discordApi = new REST({ version: "10" });
    public readonly devGuildIds: string[];

    public constructor(options: CommandRegistryOptions) {
        super(`interactions/commands`);
        this.devGuildIds = options.devGuildIds;
        this.discordApi.setToken(process.env.CLIENT_TOKEN!);
    }

    private async importSubcommand(command: Command, path: string) {
        const SubcommandClass = (await import(path)).default as ConcreteSubcommandConstructor;

        const truncatedPath = path
            .match(/(?<=src).*/)?.[0]
            .replaceAll(/\\/g, "/")
            .replace(/^/, "....") ?? path;

        assert(
            isConstructor(SubcommandClass),
            color(
                c => c.redBright`A subcommand class was not exported at`,
                c => c.cyanBright(truncatedPath),
            )
        );
        assert(
            Subcommand.isPrototypeOf(SubcommandClass),
            color(
                c => c.redBright`Class at`,
                c => c.cyanBright(truncatedPath),
                c => c.redBright`must extend the`,
                c => c.bgGreenBright`Subcommand`,
                c => c.redBright`class!`,
            )
        );

        return new SubcommandClass(command);
    }

    private async registerCommandWithSubcommands(commandFile: Dirent) {
        const parentCommandDir = await fs.readdir(path.join(this.path, commandFile.name), {
            withFileTypes: true,
        });

        const subcommandDirs = parentCommandDir.filter(f => f.isDirectory());
        const parentCommandFile = parentCommandDir.find(f => f.isFile());

        assert(
            parentCommandDir.length === 2 &&
            subcommandDirs.length === 1 &&
            parentCommandFile &&
            this.isJsFile(parentCommandFile) &&
            subcommandDirs[0].name === "subcommands",
            color(
                c => c.redBright`A parent command must contain a file, and a folder named 'subcommands'.`
            )
        );

        const parentCommand = await this.import<Command>(
            path.join(this.path, commandFile.name, parentCommandFile.name)
        );

        assert(
            !this.has(parentCommand.builder.name),
            color(
                c => c.redBright`Command`,
                c => c.cyanBright`[${parentCommand.builder.name}]`,
                c => c.redBright`already exists.`
            )
        );

        const subcommandDir = await fs.readdir(
            path.join(this.path, commandFile.name, "subcommands"),
            { withFileTypes: true },
        );

        // import all subcommands in the folder and map into a collection
        const subcommands = (
            await Promise.all(subcommandDir
                .filter(f => this.isJsFile(f))
                .map(subcommandFile => this.importSubcommand(
                    parentCommand,
                    path.join(this.path, commandFile.name, "subcommands", subcommandFile.name)
                ))
            )
        ).reduce(
            (coll, subcommand) => {
                assert(
                    !coll.has(subcommand.builder.name),
                    color(
                        c => c.redBright`Subcommand`,
                        c => c.cyanBright`[${subcommand.builder.name}]`,
                        c => c.redBright`already exists in command`,
                        c => c.cyanBright`[${parentCommand.builder.name}]`,
                        c => c.redBright`.`
                    )
                );

                for (const Guard of subcommand.guards ?? []) {
                    const guard = new Guard();

                    assert(
                        guard.slashRun,
                        color(
                            c => c.redBright`Guard`,
                            c => c.cyanBright`[${guard.name}]`,
                            c => c.redBright`must have a`,
                            c => c.cyanBright`[slashRun]`,
                            c => c.redBright`method for command`,
                            c => c.cyanBright`[${parentCommand.builder.name}-${subcommand.builder.name}]`,
                            c => c.redBright`.`
                        )
                    );
                }

                return coll.set(subcommand.builder.name, subcommand);
            },
            new Collection<string, Subcommand>()
        );

        Reflect.set(parentCommand, "subcommands", subcommands);
        this.set(parentCommand.builder.name, parentCommand);
    }

    public async register() {
        assert(
            process.env.NODE_ENV === "development" || process.env.NODE_ENV === "production",
            color(
                c => c.redBright`Unrecognized NODE_ENV value. Must be either:`,
                c => c.cyanBright`'development'`,
                c => c.redBright`or`,
                c => c.cyanBright`'production'`,
                c => c.redBright`.`
            )
        );

        await this.cleanGuildCommands();

        const spinner = ora({
            text: color(c => c.cyanBright`Registering application commands...`),
        }).start();

        const commandDir = await fs.readdir(this.path, { withFileTypes: true });

        for (const commandFile of commandDir) {
            // has subcommands
            if (commandFile.isDirectory()) {
                await this.registerCommandWithSubcommands(commandFile);
                continue;
            }

            if (!this.isJsFile(commandFile)) continue;

            const command = await this.import<Command>(path.join(this.path, commandFile.name));

            assert(
                !this.has(command.builder.name),
                color(
                    c => c.redBright`Command`,
                    c => c.cyanBright`[${command.builder.name}]`,
                    c => c.redBright`already exists.`
                )
            );

            for (const Guard of command.guards ?? []) {
                const guard = new Guard();

                if (command.isSlashCommand()) {
                    assert(
                        guard.slashRun,
                        color(
                            c => c.redBright`Guard`,
                            c => c.cyanBright`[${guard.name}]`,
                            c => c.redBright`must have a`,
                            c => c.cyanBright`[slashRun]`,
                            c => c.redBright`method for command`,
                            c => c.cyanBright`[${command.builder.name}]`,
                            c => c.redBright`.`
                        )
                    );
                }
            }

            this.set(command.builder.name, command);
        }

        const slashCommands = this.filter(command => command.isSlashCommand(), this);

        assert(
            slashCommands.size <= 100,
            color(c => c.redBright`You can only have 100 chat input commands per application.`)
        );

        if (process.env.NODE_ENV === "development") {
            assert(this.devGuildIds.length, color(c => c.redBright`No development guild IDs provided.`));

            for (const [index, guildId] of this.devGuildIds.entries()) {
                const route = Routes.applicationGuildCommands(process.env.CLIENT_ID!, guildId);
                await this.discordApi.put(route, {
                    body: [
                        ...slashCommands.map(command => command.builder.toJSON()),
                    ],
                });
                spinner.text = `Registering commands in guild ID [${guildId}]... (${index + 1}/${this.devGuildIds.length})`;
            }

            spinner.succeed(
                color(
                    c => c.green`Registered`,
                    c => c.greenBright.bold`${slashCommands.size}`,
                    c => c.green`slash ${slashCommands.size === 1 ? "command" : "commands"}`,
                    c => c.green`for`,
                    c => c.greenBright.bold`${this.devGuildIds.length}`,
                    c => c.green`development ${this.devGuildIds.length === 1 ? "guild" : "guilds"}!`
                )
            );

            return;
        }

        const route = Routes.applicationCommands(process.env.CLIENT_ID!);

        await this.discordApi.put(route, {
            body: [
                ...slashCommands.map(command => command.builder.toJSON()),
            ],
        });

        spinner.succeed(`Registered global application commands!`);
    }

    private async cleanGuildCommands() {
        const spinner = ora({
            text: color(c => c.cyanBright`Cleaning guild application commands...`),
        });

        for (const guildId of this.devGuildIds) {
            const [error, commands] = await tryit(() => this.discordApi.get(
                Routes.applicationGuildCommands(process.env.CLIENT_ID!, guildId)
            ))();

            if (error) {
                spinner.fail(
                    color(
                        c => c.redBright`Failed to get commands in guild ID`,
                        c => c.cyanBright`[${guildId}]`,
                    )
                );
                throw new HyperionError(e => e.FailedToGetGuildCommands(guildId), error);
            }

            for (const command of commands as ApplicationCommand[]) {
                const [error] = await tryit(() => this.discordApi.delete(
                    Routes.applicationGuildCommand(
                        process.env.CLIENT_ID!,
                        guildId,
                        command.id,
                    )
                ))();

                if (error) {
                    spinner.fail(
                        color(
                            c => c.redBright`Failed to delete command`,
                            c => c.cyanBright`[${command.name}]`,
                            c => c.redBright`in guild ID`,
                            c => c.cyanBright`[${guildId}]`,
                            c => c.redBright`.`
                        )
                    );
                    throw new HyperionError(e => e.FailedToDeleteGuildCommands(guildId), error);
                }
            }
        }

    }
}

export interface CommandRegistryOptions {
    devGuildIds: string[];
}