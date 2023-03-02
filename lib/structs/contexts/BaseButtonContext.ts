import type { HyperionClient } from "../HyperionClient";
import type { ButtonInteraction } from "discord.js";
import { BaseComponentContext } from "./BaseComponentContext";

export class BaseButtonContext<C extends HyperionClient = HyperionClient, DB = any> extends BaseComponentContext<C, DB> {
    constructor(client: C, public readonly interaction: ButtonInteraction) {
        super(client, interaction);
    }
}

