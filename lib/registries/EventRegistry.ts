import { Registry } from "./Registry";
import type { Event, HyperionClient } from "../structs";
import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { color } from "../utils";
import assert from "node:assert/strict";
import type { ClientEvents } from "discord.js";
import { tri } from "try-v2";

export class EventRegistry extends Registry<keyof ClientEvents, Event> {
    private readonly progress = ora({
        text: color(c => c.cyanBright`Registering events...`),
    });

    public constructor(client: HyperionClient) {
        super(client, `events`);
    }

    public async register() {
        this.progress.start();

        const [dirNotFoundError, eventDir] = await tri(fs.readdir(this.path, { withFileTypes: true }));

        if (dirNotFoundError) {
            this.progress.fail(
                color(
                    c => c.white`Could not find`,
                    c => c.cyanBright`${this.truncatedPath}`
                )
            );
            return;
        }

        for (const eventFile of eventDir) {
            if (!this.isJsFile(eventFile)) continue;

            const event = await this.import<Event>(path.join(this.path, eventFile.name), this.client);

            assert(
                !this.has(event.name),
                chalk.redBright`Event ${event.name} already registered. Please specify a different name property.`
            );

            if (event.once) {
                this.client.once(event.name, event.run);
            }
            else {
                this.client.on(event.name, event.run);
            }

            this.set(event.name ?? eventFile.name, event);
        }

        this.progress.succeed(
            color(
                c => c.green`Registered`,
                c => c.greenBright.bold(this.size),
                c => c.green`events!`
            )
        );
    }

    public removeEvent(name: keyof ClientEvents) {
        const event = this.get(name);
        if (!event) return false;

        this.client.off(event.name, event.run);
        return this.delete(name);
    }
}