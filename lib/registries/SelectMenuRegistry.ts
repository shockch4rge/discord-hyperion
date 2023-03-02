import { Registry } from "./Registry";
import type { SelectMenu } from "../structs";
import ora from "ora";
import chalk from "chalk";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { color } from "../utils";

export class SelectMenuRegistry extends Registry<string, SelectMenu> {
    public constructor() {
        super(`interactions/select-menus`);
    }

    public async register() {
        const spinner = ora({
            text: chalk.cyanBright`Registering select menus...`,
        }).start();

        const selectMenuDir = await fs.readdir(this.path, { withFileTypes: true });

        for (const selectMenuFile of selectMenuDir) {
            if (!this.isJsFile(selectMenuFile)) continue;

            const selectMenu = await this.import<SelectMenu>(path.join(this.path, selectMenuFile.name));
            const selectMenuId = selectMenu.id ?? selectMenuFile.name;

            selectMenu.builder.setCustomId(selectMenuId);

            for (const Guard of selectMenu.guards ?? []) {
                const guard = new Guard();

                assert(
                    guard.selectMenuRun,
                    color(
                        c => c.redBright`Guard`,
                        c => c.cyanBright`[${guard.name}]`,
                        c => c.redBright`must have a`,
                        c => c.cyanBright`[selectMenuRun]`,
                        c => c.redBright`method for selectMenu`,
                        c => c.cyanBright`[${selectMenuId}]`,
                        c => c.redBright`.`
                    )
                );
            }

            this.set(selectMenu.id ?? selectMenuFile.name, selectMenu);
        }

        spinner.succeed(
            color(
                c => c.greenBright`Registered`,
                c => c.greenBright.bold(this.size),
                c => c.greenBright`selectMenus!`
            )
        );
    }
}