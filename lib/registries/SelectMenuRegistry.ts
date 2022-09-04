import assert from "assert";
import chalk from "chalk";
import fs from "node:fs/promises";
import ora from "ora";
import path from "path";

import { SelectMenu } from "../structures/interaction/component";
import { TritonClient } from "../TritonClient";
import { importFile } from "../util/importFile";
import { Registry } from "./Registry";

export class SelectMenuRegistry extends Registry<SelectMenu> {
    public constructor(public readonly client: TritonClient) {
        super();
    }

    public async register() {
        const spinner = ora({
            text: chalk.cyanBright`Registering select menus...`,
        }).start();

        const routeParsing = this.client.options.routeParsing;
        let folderPath: string | undefined;

        if (routeParsing.type === "default") {
            folderPath = path.join(this.importPath, `./interactions/select-menus`);
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
            const selectMenu = await importFile<SelectMenu>(route);

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

            this.set(selectMenu.options.id, selectMenu);
        }

        spinner.succeed(
            chalk.green`Registered ${chalk.greenBright.bold(this.size)} select ${
                this.size !== 1 ? "menus" : "menu"
            }!`
        );
    }
}
