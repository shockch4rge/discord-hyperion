import {
    ActionRowBuilder, ComponentType, EmbedBuilder, Guild, ModalMessageModalSubmitInteraction
} from "discord.js";

import { TritonClient } from "../../TritonClient";
import { AltInteractionUpdateOptions, Context } from "./Context";

export class ModalContext<C extends TritonClient = TritonClient> extends Context<C> {
    public constructor(
        public readonly interaction: ModalMessageModalSubmitInteraction,
        client: C,
        guild: Guild | null
    ) {
        super(client, guild);
    }

    public field(fieldId: string, type?: ComponentType) {
        return this.interaction.fields.getField(fieldId, type);
    }

    public text(fieldId: string) {
        return this.interaction.fields.getTextInputValue(fieldId);
    }

    public async update(options: AltInteractionUpdateOptions) {
        if (typeof options === "string") {
            return this.interaction.update({
                content: options,
            });
        } else if (options instanceof EmbedBuilder) {
            return this.interaction.update({
                embeds: [options],
            });
        } else {
            return this.interaction.update({
                ...options,
                embeds: options.embeds?.map(builder => {
                    if (typeof builder === "function") {
                        return builder(new EmbedBuilder());
                    }

                    return builder;
                }),
                components: options.components?.map(components =>
                    new ActionRowBuilder<any>().addComponents(components)
                ),
            });
        }
    }
}
