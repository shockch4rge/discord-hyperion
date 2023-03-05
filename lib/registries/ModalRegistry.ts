import { Registry } from "./Registry";
import type { HyperionClient, Modal } from "../structs/";
import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { color } from "../utils";

export class ModalRegistry extends Registry<string, Modal> {
    public constructor(client: HyperionClient) {
        super(client, `interactions/modals`);
    }

    public async register() {
        const spinner = ora({
            text: chalk.cyanBright`Registering modals...`,
        }).start();

        const modalDir = await fs.readdir(this.path, { withFileTypes: true });

        for (const modalFile of modalDir) {
            if (!this.isJsFile(modalFile)) continue;

            const modal = await this.import<Modal>(path.join(this.path, modalFile.name));
            const modalId = modal.builder.data.custom_id ?? modalFile.name;

            modal.builder.setCustomId(modalId);

            // for (const Guard of modal.guards ?? []) {
            //     const guard = new Guard();
            //
            //     assert(
            //         guard.modalRun,
            //         color(
            //             c => c.redBright`Guard`,
            //             c => c.cyanBright`[${guard.name}]`,
            //             c => c.redBright`must have a`,
            //             c => c.cyanBright`[modalRun]`,
            //             c => c.redBright`method for modal`,
            //             c => c.cyanBright`[${modalId}]`,
            //             c => c.redBright`.`
            //         )
            //     );
            // }

            this.set(modalId ?? modalFile.name, modal);
        }

        spinner.succeed(
            color(
                c => c.greenBright`Registered`,
                c => c.greenBright.bold(this.size),
                c => c.greenBright`modals!`
            )
        );
    }
}