import { ButtonInteraction, Client, Guild } from "discord.js";

import { TritonClient } from "../..";
import { Context } from "./Context";

export class ButtonContext<C extends Client = TritonClient> extends Context<C> {
    public constructor(
        client: C,
        public readonly interaction: ButtonInteraction,
        guild: Guild | null
    ) {
        super(client, guild);
    }

    public update() {
        this.interaction.update({
            content: "Updated!",
        });
    }
}
