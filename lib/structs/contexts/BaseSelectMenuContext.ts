import type { HyperionClient } from "../HyperionClient";
import type { AnySelectMenuInteraction } from "discord.js";
import { BaseComponentContext } from "./BaseComponentContext";

export class BaseSelectMenuContext<
    C extends HyperionClient = HyperionClient,
    DB = any,
    InteractionType extends AnySelectMenuInteraction = AnySelectMenuInteraction
> extends BaseComponentContext<C, DB> {
    constructor(client: C, public readonly interaction: InteractionType) {
        super(client, interaction);
    }
}

