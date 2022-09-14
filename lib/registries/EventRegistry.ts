import chalk from "chalk";
import { ClientEvents } from "discord.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import { Event } from "../structures/Event";
import { Registry } from "./Registry";

export class EventRegistry extends Registry<Event> {
    public async register() {
        const folderPath = path.join(this.importPath, "events");

        const eventFolder = await fs.readdir(folderPath, { withFileTypes: true });

        for (const eventFile of eventFolder) {
            assert(
                this.isValidFile(eventFile),
                `Invalid file found in events folder: ${eventFile.name}`
            );

            const event = await this.import<Event>(path.join(folderPath, eventFile.name));
            const eventName =
                event.options.name ?? (eventFile.name.slice(0, -3) as keyof ClientEvents);

            assert(
                !this.has(eventName),
                chalk.redBright`Event ${eventName} already registered. Please specify a different name property.`
            );

            if (event.options.once) {
                this.client.once(eventName, event.run);
            } else {
                this.client.on(eventName, event.run);
            }

            this.set(`${eventName}-${this}`, event);
        }
    }
}
