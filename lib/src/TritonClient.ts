import "dotenv/config";

import { Client, ClientOptions, Collection, REST, Routes, Snowflake } from "discord.js";
import fs from "fs/promises";
import assert from "node:assert";
import path from "node:path";
import ora from "ora";
import _ from "radash";

import { Command } from "@interaction/command";
import { DefaultLogger, Logger } from "@util/Logger";
import { TritonError } from "@util/TritonError";
import { Constructor } from "@util/types";

export class TritonClient extends Client {
    public readonly options: TritonClientOptions;
    public readonly util: TritonClientUtils;
    public readonly commands: Collection<string, Command>;

    public constructor(options: TritonClientOptions) {
        super(options);

        assert(
            process.env.DISCORD_APP_ID,
            "You must specify a Discord application ID in your .env file."
        );
        assert(
            process.env.DISCORD_APP_TOKEN,
            "You must specify a Discord application token in your .env file."
        );
        assert(
            process.env.NODE_ENV,
            "You must set your 'NODE_ENV' variable in your .env file as 'development' or 'production'."
        );

        this.options = options;
        this.commands = new Collection();
        this.util = {
            logger: options.useDefaultLogger ? new DefaultLogger() : options.logger,
        };
    }

    public async start() {
        await this.registerCommands();
    }

    private async import<T>(file: string) {
        const Class = (await import(file)) as Constructor<T>;
        return new Class();
    }

    private async registerCommands() {
        const spinner = ora({
            text: "Registering commands...",
        }).start();

        const routeParsing = this.options.routeParsing;
        let folderPath: string | undefined;

        if (routeParsing.type === "default") {
            folderPath = path.join(__dirname, `"./interactions/commands"`);
        } else {
            folderPath = `${routeParsing.directories.baseDir}/${routeParsing.directories.commands}`;

            if (!folderPath) {
                spinner.stopAndPersist({
                    text: "No 'commands' directory specified. Skipping for now.",
                    prefixText: "❓",
                });
                return;
            }
        }

        let fileNames: string[];

        try {
            fileNames = await fs.readdir(folderPath);
        } catch (e) {
            throw new TritonError("FOLDER_NOT_FOUND", folderPath);
        }

        const defaultFilter = (fileName: string) =>
            fileName.endsWith(".ts") || fileName.endsWith(".js");

        const isFile =
            routeParsing.type === "custom" ? routeParsing.filter ?? defaultFilter : defaultFilter;

        for (const file of fileNames) {
            if (!isFile(file)) continue;

            const route = path.join(folderPath, file);
            const command = await this.import<Command>(route);

            /* 
                TODO: extra validation
            */

            this.commands.set(command.options.name, command);
        }

        const rest = new REST({
            version: "10",
        }).setToken(process.env.DISCORD_TOKEN);

        const devGuildIds = this.options.devGuildIds;

        if (devGuildIds && devGuildIds.length > 0) {
            assert(
                process.env.NODE_ENV === "development",
                "You've specified guild IDs for development, but you're not in development mode. Make sure that the 'NODE_ENV' variable in your .env file is set to 'development'."
            );

            for (const [index, guildId] of devGuildIds.entries()) {
                const route = Routes.applicationGuildCommands(process.env.DISCORD_APP_ID, guildId);
                await rest.put(route, {
                    body: [this.commands.map(command => command.buildSlash())],
                });
                spinner.text = `Registering commands in ${guildId}... (${index + 1}/${
                    devGuildIds.length
                })`;
            }

            spinner.succeed(`Registered commands for ${devGuildIds.length} development guilds!`);
            return;
        }

        assert(
            process.env.NODE_ENV === "production",
            "You're not in production mode. Make sure that the 'NODE_ENV' variable in your .env file is set to 'production'."
        );

        const route = Routes.applicationCommands(process.env.DISCORD_APP_ID);

        await rest.put(route, {
            body: [this.commands.map(command => command.buildSlash()?.toJSON())],
        });

        spinner.succeed(`Registered global commands!`);
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
          logger: Logger;
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
