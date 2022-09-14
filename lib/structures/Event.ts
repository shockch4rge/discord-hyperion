import { ClientEvents } from "discord.js";

export abstract class Event<K extends keyof ClientEvents = keyof ClientEvents> {
    public constructor(public readonly options: EventOptions<K>) {}

    public abstract run(...args: ClientEvents[K]): Promise<void>;
}

export type EventOptions<K extends keyof ClientEvents> = {
    name?: K;
    once?: boolean;
};
