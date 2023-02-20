import { ClientEvents } from "discord.js";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import ora from "ora";

import { HyperionClient } from "../HyperionClient";
import { Event } from "../structures/Event";
import { colorize } from "../util/colorize";
import { isConstructor } from "../util/types";
import { Registry } from "./Registry";

export class EventRegistry extends Registry<Event> {
    private async importEvent(path: string) {
        const [EventClass] = Object.values(
            (await import(path)) as Record<string, new (client: HyperionClient) => Event>
        );

        const shortPath = path
            .match(/(?<=src).*/)?.[0]
            .replaceAll(/\\/g, "/")
            .replace(/^/, "....") ?? path;

        assert(
            isConstructor(EventClass),
            colorize(
                c => c.redBright`An event class was not exported at`, 
                c => c.cyanBright(shortPath)
            )
        );
        assert(
            Event.isPrototypeOf(EventClass),
            colorize(c => c.redBright`Object at ${shortPath} must extend the Event class!`),
        );

        return new EventClass(this.client);
    }

    public async register() {
        const spinner = ora({
            text: colorize(c => c.cyanBright`Registering events...`),
        }).start();

        const dirPath = path.join(this.importPath, `./events`);
        const eventFolder = await fs.readdir(dirPath, { withFileTypes: true });

        for (const eventFile of eventFolder) {
            assert(
                this.isValidFile(eventFile),
                `Invalid file found in events folder: ${eventFile.name}`
            );

            const event = await this.importEvent(path.join(dirPath, eventFile.name));
            const eventName = (event.options && event.options.name) ?? (eventFile.name.slice(0, -3) as keyof ClientEvents);

            assert(
                !this.has(eventName),
                colorize(c => c.redBright`Event [${eventName}] already registered. Please specify a different name property.`),
            );

            if (event.options.once) {
                this.client.once(eventName, event.run);
            }
            else {
                this.client.on(eventName, event.run);
            }

            this.set(`${eventName}-${this.client.options.name}`, event);
        }

        spinner.succeed(
            colorize(
                c => c.green`Registered`,
                c => c.greenBright.bold(this.size),
                c => c.green`events!`,
            ),
        );
    }

    public deregister(key: string) {
        const event = this.get(key);
        if (!event) return false;

        this.client.off(event.options.name!, event.run);
        return this.delete(key);
    }
}
