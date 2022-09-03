import { Client, Guild } from "discord.js";

import { TritonClient } from "../../TritonClient";

export abstract class Context<C extends Client = TritonClient> {
    public constructor(public readonly client: C, public readonly guild: Guild | null) {}
}
