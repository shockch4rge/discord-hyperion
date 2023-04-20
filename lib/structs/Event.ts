import type { ClientEvents } from "discord.js";

export abstract class Event<Name extends keyof ClientEvents = keyof ClientEvents> {
    public readonly name: Name;
    public readonly once: boolean;

    protected constructor(options: EventOptions<Name>) {
        this.name = options.name;
        this.once = options.once ?? false;
    }

    public abstract run(...args: ClientEvents[Name]): Promise<void>;
}

export type EventOptions<Name extends keyof ClientEvents> = {
    name: Name;
    once?: boolean;
};