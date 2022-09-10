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
        if (this.interaction.replied) {
            this.client.logger.warn("Interaction already replied to.");
            return;
        }

        if (typeof options === "string") {
            return this.interaction.update({
                content: options,
            });
        }

        if (this.isEmbedBuildable(options)) {
            const embed = options instanceof EmbedBuilder ? options : options(new EmbedBuilder());

            return this.interaction.update({
                embeds: [embed],
            });
        }

        return this.interaction.update({
            ...options,
            embeds: options.embeds?.map(builder =>
                builder instanceof EmbedBuilder ? builder : builder(new EmbedBuilder())
            ),
            components: options.components?.map(components =>
                // leave as any as our API abstracts ActionRow anyway
                new ActionRowBuilder<any>().addComponents(components)
            ),
        });
    }
}
