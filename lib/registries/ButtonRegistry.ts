import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ora from "ora";
import path from "path";

import { HyperionClient } from "../HyperionClient";
import { Button } from "../structures/interaction/component";
import { colorize } from "../util/colorize";
import { Registry } from "./";

export class ButtonRegistry extends Registry<Button> {
    public constructor(client: HyperionClient) {
        super(client);
    }

    public async register() {
        const spinner = ora({
            text: colorize(c => c.greenBright("Registering buttons...")),
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
                    colorize(
                        c => c.redBright("Guard"),
                        c => c.cyanBright(`[${guard.options.name}]`),
                        c => c.redBright("must have a"),
                        c => c.cyanBright("[buttonRun]"),
                        c => c.redBright("method for button"),
                        c => c.cyanBright(`'${button.options.id}'`),
                        c => c.redBright("."),
                    ),
                );
            }

            this.set(button.options.id, button);
        }

        spinner.succeed(
            colorize(
                c => c.greenBright("Registered"),
                c => c.greenBright.bold(this.size),
                c => c.greenBright("buttons!"),
            )
        );
    }
}
