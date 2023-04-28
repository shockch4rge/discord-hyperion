import { Registry } from "./Registry";
import type { HyperionClient, SelectMenu } from "../structs";
import ora from "ora";
import chalk from "chalk";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { color } from "../utils";
import { tri } from "try-v2";

export class SelectMenuRegistry extends Registry<string, SelectMenu> {
    private readonly progress = ora({
        text: chalk.cyanBright`Registering select menus...`,
    });

    public constructor(client: HyperionClient) {
        super(client, `interactions/select-menus`);
    }
    
    public async register() {
        this.progress.start();
        
        const [dirNotFoundError, selectMenuDir] = await tri(fs.readdir(this.path, { withFileTypes: true }));

        if (dirNotFoundError) {
            this.progress.fail(
                color(
                    c => c.white`Could not find`,
                    c => c.cyanBright`${this.truncatedPath}`
                )
            );
            return;
        }

        for (const selectMenuFile of selectMenuDir) {
            if (!this.isJsFile(selectMenuFile)) continue;

            const selectMenu = await this.import<SelectMenu>(path.join(this.path, selectMenuFile.name));
            const selectMenuId = selectMenu.builder.data.custom_id ?? selectMenuFile.name;

            selectMenu.builder.setCustomId(selectMenuId);

            for (const guard of selectMenu.guards ?? []) {
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

            this.set(selectMenuId, selectMenu);
        }

        this.progress.succeed(
            color(
                c => c.green`Registered`,
                c => c.greenBright.bold(this.size),
                c => c.green`selectMenus!`
            )
        );
    }
}