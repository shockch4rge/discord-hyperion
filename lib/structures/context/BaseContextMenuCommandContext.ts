import {
    ActionRowBuilder, EmbedBuilder, MessageContextMenuCommandInteraction,
    UserContextMenuCommandInteraction
} from "discord.js";

import { HyperionClient } from "../../HyperionClient";
import { resolveEmbed } from "../../util/resolvers";
import { AltInteractionReplyOptions, BaseContext } from "./BaseContext";

export class BaseContextMenuCommandContext<C extends HyperionClient = HyperionClient> extends BaseContext<C> {
    public constructor(client: C, public readonly kind: string, public readonly interaction: HybridContextMenuCommandInteraction) {
        super(client, interaction.guild);
    }

    public target() {
        if (this.interaction.isUserContextMenuCommand()) {
            return this.interaction.targetUser;
        }

        return this.interaction.targetMessage;
    }

    public async reply(options: AltInteractionReplyOptions) {
        if (typeof options === "string") {
            if (this.interaction.replied) {
                return this.interaction.editReply({
                    content: options,
                });
            }

            return this.interaction.reply({
                content: options,
            });
        }

        if (this.isEmbedBuildable(options)) {
            const embed = resolveEmbed(options);

            if (this.interaction.replied) {
                return this.interaction.editReply({
                    embeds: [embed],
                });
            }

            return this.interaction.reply({
                embeds: [embed],
            });
        }

        return this.interaction.editReply({
            ...options,
            embeds: options.embeds?.map(resolveEmbed),
            components: options.components?.map(components =>
                new ActionRowBuilder<any>().addComponents(components)
            ),
        });
    }

    public async followUp(options: AltInteractionReplyOptions) {
        if (typeof options === "string") {
            return this.interaction.followUp({
                content: options,
            });
        }

        if (this.isEmbedBuildable(options)) {
            return this.interaction.followUp({
                embeds: [resolveEmbed(options)],
            });
        }

        return this.interaction.followUp({
            ...options,
            embeds: options.embeds?.map(resolveEmbed),
            components: options.components?.map(components =>
                new ActionRowBuilder<any>().addComponents(components)
            ),
        });
    }

    public buildLogEmbed() {
        return new EmbedBuilder()
            .setAuthor({
                name: `${this.interaction.user.tag} used [${this.interaction.commandName}] => (${this.kind.toUpperCase()}_CONTEXT_MENU)`,
                iconURL: this.interaction.user.avatarURL() ?? undefined,
            })
            .setFooter({
                text: `Timestamp: ${this.interaction.createdTimestamp}`,
                iconURL: this.guild?.iconURL() ?? undefined,
            })
            .setColor("Blurple");
    }
}

export type HybridContextMenuCommandInteraction = MessageContextMenuCommandInteraction | UserContextMenuCommandInteraction;
