import { Registry } from "./Registry";
import type { Button, HyperionClient } from "../structs/";
import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import assert from "node:assert/strict";
import { color } from "../utils";
import { ButtonStyle, ComponentType } from "discord.js";

export class ButtonRegistry extends Registry<string, Button> {
    public constructor(client: HyperionClient) {
        super(client, `interactions/buttons`);
    }

    public async register() {
        const spinner = ora({
            text: chalk.cyanBright`Registering buttons...`,
        }).start();

        const buttonDir = await fs.readdir(this.path, { withFileTypes: true });

        for (const buttonFile of buttonDir) {
            if (!this.isJsFile(buttonFile)) continue;

            const button = await this.import<Button>(path.join(this.path, buttonFile.name));
            const buttonId = button.getId() ?? buttonFile.name;

            // only link buttons don't have custom ids
            if (button.builder.data.style !== ButtonStyle.Link) {
                button.builder.setCustomId(buttonId);
            }

            for (const guard of button.guards ?? []) {
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

            this.set(buttonId, button);
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