import { Registry } from "./Registry";
import type { Button } from "../structs/";
import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import assert from "node:assert/strict";
import { color } from "../utils";

export class ButtonRegistry extends Registry<string, Button> {
    public constructor() {
        super(`interactions/buttons`);
    }

    public async register() {
        const spinner = ora({
            text: chalk.cyanBright`Registering buttons...`,
        }).start();

        const buttonDir = await fs.readdir(this.path, { withFileTypes: true });

        for (const buttonFile of buttonDir) {
            if (!this.isJsFile(buttonFile)) continue;

            const button = await this.import<Button>(path.join(this.path, buttonFile.name));
            const buttonId = button.id ?? buttonFile.name;

            button.builder.setCustomId(buttonId);

            for (const Guard of button.guards ?? []) {
                const guard = new Guard();

                assert(
                    guard.buttonRun,
                    color(
                        c => c.redBright`Guard`,
                        c => c.cyanBright`[${guard.name}]`,
                        c => c.redBright`must have a`,
                        c => c.cyanBright`[buttonRun]`,
                        c => c.redBright`method for button`,
                        c => c.cyanBright`[${buttonId}]`,
                        c => c.redBright`.`
                    )
                );
            }

            this.set(button.id ?? buttonFile.name, button);
        }

        spinner.succeed(
            color(
                c => c.greenBright`Registered`,
                c => c.greenBright.bold(this.size),
                c => c.greenBright`buttons!`
            )
        );
    }
}