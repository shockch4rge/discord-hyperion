import type { HyperionClient } from "../HyperionClient";
import { BaseContext } from "./BaseContext";
import type { ModalSubmitInteraction } from "discord.js";

export class BaseModalContext<C extends HyperionClient = HyperionClient, DB = any> extends BaseContext<C, DB> {
    public constructor(client: C, public readonly interaction: ModalSubmitInteraction) {
        super(client, interaction);
    }

    public field(name: string) {
        return this.interaction.fields.getField(name);
    }
    
    public fieldValue(fieldName: string) {
        return this.interaction.fields.getTextInputValue(fieldName);
    }
}