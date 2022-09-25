import chalk from "chalk";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ora from "ora";
import path from "path";

import { HyperionClient } from "../HyperionClient";
import { Button } from "../structures/interaction/component";
import { Registry } from "./";

export class ButtonRegistry extends Registry<Button> {
    public constructor(client: HyperionClient) {
        super(client);
    }

    public async register() {
        const spinner = ora({
            text: chalk.cyanBright`Registering buttons...`,
        }).start();

        const dirPath = path.join(this.importPath, `./interactions/buttons`);
        const files = await fs.readdir(dirPath, { withFileTypes: true });

        for (const file of files) {
            if (!this.isValidFile(file)) continue;

            const route = path.join(dirPath, file.name);
            const button = await this.import<Button>(route);

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
