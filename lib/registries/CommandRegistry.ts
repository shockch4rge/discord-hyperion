import assert from "assert";
import chalk from "chalk";
import { REST, Routes } from "discord.js";
import fs from "node:fs/promises";
import ora from "ora";
import path from "path";

import { Command } from "../structures/interaction/command";
import { TritonClient } from "../TritonClient";
import { importFile } from "../util/importFile";
import { Registry } from "./Registry";

export class CommandRegistry extends Registry<Command> {
    public async register() {
        const spinner = ora({
            text: chalk.cyanBright`Registering commands...`,
        }).start();

        const routeParsing = this.client.options.routeParsing;
        let folderPath: string | undefined;

        if (routeParsing.type === "default") {
            folderPath = path.join(this.importPath, `./interactions/commands`);
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
            const command = await importFile<Command>(route);

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

            this.set(command.options.name, command);
        }

        const rest = new REST({
            version: "10",
        }).setToken(process.env.DISCORD_TOKEN!);

        const devGuildIds = this.client.options.devGuildIds;

        if (devGuildIds && devGuildIds.length > 0) {
            assert(
                process.env.NODE_ENV === "development",
                chalk.redBright`You've specified guild IDs for development, but you're not in development mode. Make sure that the 'NODE_ENV' variable in your .env file is set to 'development'.`
            );

            for (const [index, guildId] of devGuildIds.entries()) {
                const route = Routes.applicationGuildCommands(process.env.DISCORD_APP_ID!, guildId);
                await rest.put(route, {
                    body: [
                        ...this.filter(c => c.isSlashCommand()).map(c => c.buildSlash().toJSON()),
                    ],
                });
                spinner.text = `Registering commands in ${guildId}... (${index + 1}/${
                    devGuildIds.length
                })`;
            }

            spinner.succeed(
                chalk.green`Registered ${chalk.greenBright.bold(
                    this.size
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
                ...this.filter(c => c.isSlashCommand()).map(command =>
                    command.buildSlash().toJSON()
                ),
            ],
        });

        spinner.succeed(`Registered global commands!`);
    }
}
