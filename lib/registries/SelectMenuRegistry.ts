import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ora from "ora";
import path from "path";

import { SelectMenu } from "../structures/interaction/component";
import { colorize } from "../util/colorize";
import { Registry } from "./";

export class SelectMenuRegistry extends Registry<SelectMenu> {
    public async register() {
        const spinner = ora({
            text: colorize(c => c.cyanBright`Registering select menus...`),
        }).start();

        const dirPath = path.join(this.importPath, `./interactions/select-menus`);
        const files = await fs.readdir(dirPath, { withFileTypes: true });

        for (const file of files) {
            if (!this.isValidFile(file)) continue;

            const route = path.join(dirPath, file.name);
            const selectMenu = await this.import<SelectMenu>(route);

            for (const GuardFactory of selectMenu.options.guards ?? []) {
                const guard = new GuardFactory();

                assert(
                    guard.selectMenuRun,
                    colorize(
                        c => c.redBright`Guard`,
                        c => c.cyanBright`[${guard.options.name}]`,
                        c => c.redBright`must have a`,
                        c => c.cyanBright`[selectMenuRun]`,
                        c => c.redBright`method for select menu`,
                        c => c.cyanBright`[${selectMenu.options.id}]`,
                        c => c.redBright`.`,
                    )
                );
            }

            this.set(selectMenu.options.id, selectMenu);
        }

        spinner.succeed(
            colorize(
                c => c.greenBright`Registered`,
                c => c.greenBright.bold(this.size),
                c => c.greenBright`select ${this.size !== 1 ? "menus" : "menu"}!`,
            )
        );
    }
}
