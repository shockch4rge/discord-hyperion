import type { AltUpdateOptions } from "./BaseContext";
import { BaseContext } from "./BaseContext";
import type { HyperionClient } from "../HyperionClient";
import type { AnySelectMenuInteraction, ButtonInteraction, MessageActionRowComponentBuilder } from "discord.js";
import { ActionRowBuilder, EmbedBuilder } from "discord.js";
import reify from "../../utils/reify";

export abstract class BaseComponentContext<C extends HyperionClient, DB> extends BaseContext<C, DB> {
    protected constructor(client: C, public readonly interaction: AnySelectMenuInteraction | ButtonInteraction) {
        super(client, interaction);
    }

    public async update(options: AltUpdateOptions) {
        if (typeof options === "string") {
            return this.interaction.update(options);
        }

        if (typeof options === "function" || options instanceof EmbedBuilder) {
            return this.interaction.update({ embeds: [reify.embed(options)] });
        }

        return this.interaction.update({
            ...options,
            embeds: options.embeds?.map(reify.embed),
            components: options.components?.map(components =>
                new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(components)
            ),
        });
    }
}