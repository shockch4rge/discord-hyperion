import chalk from "chalk";
import fs from "node:fs/promises";
import path from "node:path";
import ora from "ora";

import { Modal } from "../structures/interaction/component/modal";
import { Registry } from "./Registry";

export class ModalRegistry extends Registry<Modal> {
    public async register() {
        const spinner = ora({
            text: chalk.cyanBright`Registering modals...`,
        }).start();

        const dirPath = path.join(this.importPath, `./interactions/modals`);
        const files = await fs.readdir(dirPath, { withFileTypes: true });

        for (const file of files) {
            if (!this.isValidFile(file)) continue;

            const route = path.join(dirPath, file.name);
            const modal = await this.import<Modal>(route);

            this.set(modal.options.id, modal);
        }

        spinner.succeed(
            chalk.green`Registered ${chalk.greenBright.bold(this.size)} ${this.size !== 1 ? "modals" : "modal"}!`
        );
    }
}
