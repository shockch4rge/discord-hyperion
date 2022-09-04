import assert from "assert";
import chalk from "chalk";
import fs from "node:fs/promises";
import ora from "ora";
import path from "path";

import { Button } from "../structures/interaction/component";
import { TritonClient } from "../TritonClient";
import { importFile } from "../util/importFile";
import { Registry } from "./Registry";

export class ButtonRegistry extends Registry<Button> {
    public constructor(public readonly client: TritonClient) {
        super();
    }

    public async register() {
        const spinner = ora({
            text: chalk.cyanBright`Registering buttons...`,
        }).start();

        const routeParsing = this.client.options.routeParsing;
        let folderPath: string | undefined;

        if (routeParsing.type === "default") {
            folderPath = path.join(this.importPath, `./interactions/buttons`);
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
            const button = await importFile<Button>(route);

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

            this.set(button.options.id, button);
        }

        spinner.succeed(chalk.green`Registered ${chalk.greenBright.bold(this.size)} buttons!`);
    }
}
