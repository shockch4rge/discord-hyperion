import { ActionRowBuilder, ComponentType, ModalMessageModalSubmitInteraction } from "discord.js";

import { HyperionClient } from "../../HyperionClient";
import { resolveEmbed } from "../../util/resolvers";
import { AltInteractionUpdateOptions, BaseContext } from "./BaseContext";

export class BaseModalContext<C extends HyperionClient = HyperionClient> extends BaseContext<C> {
    public constructor(
        client: C,
        public readonly interaction: ModalMessageModalSubmitInteraction,
    ) {
        super(client, interaction.guild);
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
            const embed = resolveEmbed(options);

            return this.interaction.update({
                embeds: [embed],
            });
        }

        return this.interaction.update({
            ...options,
            embeds: options.embeds?.map(resolveEmbed),
            components: options.components?.map(components =>
                // leave as any as our API abstracts ActionRow anyway
                new ActionRowBuilder<any>().addComponents(components)
            ),
        });
    }
}
