import { Client, Guild } from "discord.js";

import { TritonClient } from "../../TritonClient";

export abstract class Context<C extends Client = TritonClient> {
    public constructor(public readonly client: C, public readonly guild: Guild | null) {}

    public abstract reply(options: unknown): Promise<unknown>;
    public abstract followUp(options: unknown): Promise<unknown>;
}
