import assert from "assert";
import chalk from "chalk";
import fs from "node:fs/promises";
import path from "node:path";
import ora from "ora";

import { Modal } from "../structures/interaction/component/modal";
import { importFile } from "../util/importFile";
import { Registry } from "./Registry";

export class ModalRegistry extends Registry<Modal> {
    public async register() {
        const spinner = ora({
            text: chalk.cyanBright`Registering modals...`,
        }).start();

        const routeParsing = this.client.options.routeParsing;
        let folderPath: string | undefined;

        if (routeParsing.type === "default") {
            folderPath = path.join(this.importPath, `./interactions/modals`);
        } else {
            folderPath = `${routeParsing.directories.baseDir}/${routeParsing.directories.modals}`;

            if (!folderPath) {
                spinner.stopAndPersist({
                    text: chalk.yellow`No 'modals' directory specified. Skipping for now.`,
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
            const modal = await importFile<Modal>(route);

            // for (const GuardFactory of modal.options.guards ?? []) {
            //     const guard = new GuardFactory();

            //     assert(
            //         guard.modalRun,
            //         `${chalk.redBright("Guard ")}${chalk.cyanBright(
            //             `'${guard.options.name}'`
            //         )}${chalk.redBright(" must have a ")}${chalk.cyanBright(
            //             "'modalRun'"
            //         )}${chalk.redBright(" method for select menu ")}${chalk.cyanBright(
            //             `'${modal.options.id}'`
            //         )}${chalk.redBright(".")}`
            //     );
            // }

            this.set(modal.options.id, modal);
        }

        spinner.succeed(
            chalk.green`Registered ${chalk.greenBright.bold(this.size)} ${
                this.size !== 1 ? "modals" : "modal"
            }!`
        );
    }
}
