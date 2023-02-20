import { ActionRowBuilder, ChatInputCommandInteraction, Colors, EmbedBuilder } from "discord.js";

import { HyperionClient } from "../..";
import { resolveEmbed } from "../../util/resolvers";
import { CommandArgResolver } from "../interaction/command/Command";
import { AltInteractionReplyOptions, BaseContext } from "./BaseContext";

export class BaseSlashCommandContext<C extends HyperionClient = HyperionClient> extends BaseContext<C> {
    public readonly logger = this.client.logger;

    public constructor(
        client: C,
        public readonly interaction: ChatInputCommandInteraction,
        public readonly args: CommandArgResolver,
    ) {
        super(client, interaction.guild);
    }

    public buildLogEmbed() {
        return new EmbedBuilder()
            .setAuthor({
                name: `${this.interaction.user.tag} used '${this.interaction.commandName}'`,
                iconURL: this.interaction.user.avatarURL() ?? undefined,
            })
            .setFooter({
                text: `Timestamp: ${this.interaction.createdTimestamp}`,
                iconURL: this.guild?.iconURL() ?? undefined,
            })
            .setColor("Blurple");
    }

    public async reply(options: AltInteractionReplyOptions) {
        if (typeof options === "string") {
            return this.interaction.editReply({
                content: options,
            });
        }

        if (this.isEmbedBuildable(options)) {
            const embed = resolveEmbed(options);

            return this.interaction.editReply({
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
            const embed = resolveEmbed(options);

            return this.interaction.followUp({
                embeds: [embed],
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
}
