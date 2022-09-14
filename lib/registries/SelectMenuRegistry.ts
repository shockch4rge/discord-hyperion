import chalk from "chalk";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ora from "ora";
import path from "path";

import { SelectMenu } from "../structures/interaction/component";
import { Registry } from "./";

export class SelectMenuRegistry extends Registry<SelectMenu> {
    public async register() {
        const spinner = ora({
            text: chalk.cyanBright`Registering select menus...`,
        }).start();

        const routeParsing = this.client.options.routeParsing;
        let folderPath: string | undefined;

        if (routeParsing.type === "default") {
            folderPath = path.join(this.importPath, `./interactions/select-menus`);
        } else {
            const baseDir = routeParsing.directories.baseDir;
            const selectMenuDir = routeParsing.directories.selectMenus;

            if (!baseDir || !selectMenuDir) {
                spinner.stopAndPersist({
                    text: chalk.yellow`No 'selectMenus' directory specified. Skipping for now.`,
                    prefixText: "❓",
                });
                return;
            }

            folderPath = `${baseDir}/${selectMenuDir}`;
        }

        const files = await fs.readdir(folderPath, { withFileTypes: true });

        for (const file of files) {
            if (!this.isValidFile(file)) continue;

            const route = path.join(folderPath, file.name);
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

            this.set(selectMenu.options.id, selectMenu);
        }

        spinner.succeed(
            chalk.green`Registered ${chalk.greenBright.bold(this.size)} select ${
                this.size !== 1 ? "menus" : "menu"
            }!`
        );
    }
}
