import {
    ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, ComponentType,
    EmbedBuilder, MessageCollectorOptions, MessageComponentCollectorOptions, normalizeArray,
    RestOrArray
} from "discord.js";

import { EmbedFnOrBuilder } from "../structures/context";
import { ComponentFnOrBuilder, resolveButton, resolveEmbed } from "./resolvers";
import { Time } from "./Time";
import { Modify } from "./types";

export namespace PaginatedEmbedBuilder {
    export class Interaction<I extends ChatInputCommandInteraction> {
        public readonly data: PaginatedInteractionEmbedData;

        public constructor(
            public readonly interaction: I,
            options?: PaginatedInteractionEmbedOptions
        ) {
            this.data = this.resolveOptions(options);
        }

        public async send() {
            const message = await this.interaction.reply({
                embeds: [this.data.pages[this.data.index]],
            });

            const collector = this.interaction.channel!.createMessageComponentCollector({
                ...this.data.collectorOptions,
                componentType: ComponentType.Button,
                filter: i => i.user.id === this.interaction.user.id && i.message.id === message.id,
            });

            collector.on("collect", async interaction => {
                if (interaction.customId === "help-next") {
                    await this.next();
                }

                if (interaction.customId === "help-prev") {
                    await this.previous();
                }

                if (interaction.customId === "help-end") {
                    await this.end();
                }

                if (interaction.customId === "help-begin") {
                    await this.beginning();
                }
            });

            collector.on("end", async () => {
                await this.interaction.editReply({
                    embeds: [this.data.embedOnEnd],
                    components: [],
                });
            });
        }

        public addPages(...pages: RestOrArray<EmbedBuilder>) {
            this.data.pages.push(...normalizeArray(pages));
            return this;
        }

        public setPages(...pages: RestOrArray<EmbedBuilder>) {
            this.data.pages = normalizeArray(pages);
            return this;
        }

        public setStartIndex(index: number) {
            this.data.index = index;
            return this;
        }

        public setStartButton(builder: ComponentFnOrBuilder<ButtonBuilder>) {
            this.data.startButton = resolveButton(builder);
            return this;
        }

        public setEndButton(builder: ComponentFnOrBuilder<ButtonBuilder>) {
            this.data.endButton = resolveButton(builder);
            return this;
        }

        public setNextButton(builder: ComponentFnOrBuilder<ButtonBuilder>) {
            this.data.nextButton = resolveButton(builder);
            return this;
        }

        public setPreviousButton(builder: ComponentFnOrBuilder<ButtonBuilder>) {
            this.data.previousButton = resolveButton(builder);
            return this;
        }

        public setSearchButton(builder: ComponentFnOrBuilder<ButtonBuilder>) {
            this.data.searchButton = resolveButton(builder);
            return this;
        }

        public get first() {
            return this.data.pages[0];
        }

        public get last() {
            return this.data.pages[this.data.pages.length - 1];
        }

        public async next() {
            const embed = this.data.pages[this.data.index];

            if (this.isLastPage) {
                return embed;
            }

            this.data.index++;

            await this.interaction.reply({
                embeds: [embed],
            });

            return embed;
        }

        public async previous() {
            const embed = this.data.pages[this.data.index];
            if (this.isFirstPage) {
                return embed;
            }

            this.data.index--;

            await this.interaction.reply({
                embeds: [embed],
            });

            return this.data.pages[this.data.index];
        }

        public async end() {
            if (this.isLastPage) return;

            this.data.index = this.data.pages.length - 1;

            await this.interaction.reply({
                embeds: [this.data.pages[this.data.index]],
            });
        }

        public async beginning() {
            if (this.data.index === 0) return;

            await this.interaction.reply({
                embeds: [this.data.pages[this.data.index]],
            });
        }

        public hasPage(index: number) {
            return this.data.pages.at(index);
        }

        public get isFirstPage() {
            return this.data.index === 0;
        }

        public get isLastPage() {
            if (!this.data.pages) return false;

            return this.data.index === this.data.pages.length - 1;
        }

        private resolveOptions(options?: PaginatedInteractionEmbedOptions) {
            const {
                collectorOptions,
                index = 0,
                pages = [],
                startButton,
                endButton,
                nextButton,
                searchButton,
                previousButton,
                embedOnEnd,
            } = options ?? {};

            return {
                index: index,
                pages: pages.map(resolveEmbed),
                collectorOptions: collectorOptions ?? {
                    time: Time.seconds(15),
                    dispose: true,
                },
                startButton: resolveButton(
                    startButton ??
                        new ButtonBuilder()
                            .setEmoji("⏮️")
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(index === 0)
                ),
                endButton: resolveButton(
                    endButton ??
                        new ButtonBuilder()
                            .setEmoji("⏭️")
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(index >= pages.length)
                ),
                nextButton: resolveButton(
                    nextButton ??
                        new ButtonBuilder()
                            .setEmoji("▶️")
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(index >= pages.length)
                ),
                previousButton: resolveButton(
                    previousButton ??
                        new ButtonBuilder()
                            .setEmoji("◀️")
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(index === 0)
                ),
                searchButton: resolveButton(
                    searchButton ??
                        new ButtonBuilder().setEmoji("🔍").setStyle(ButtonStyle.Secondary)
                ),
                embedOnEnd: resolveEmbed(
                    embedOnEnd ??
                        new EmbedBuilder()
                            .setAuthor({
                                name: "❗  Please use the help command again.",
                            })
                            .setColor("Red")
                ),
            };
        }
    }
}

export type PaginatedInteractionEmbedData = Required<
    Modify<
        PaginatedInteractionEmbedOptions,
        {
            pages: EmbedBuilder[];
            embedOnEnd: EmbedBuilder;
        }
    >
>;

export type PaginatedInteractionEmbedOptions = {
    pages: EmbedFnOrBuilder[];
    index?: number;
    startButton?: ComponentFnOrBuilder<ButtonBuilder>;
    previousButton?: ComponentFnOrBuilder<ButtonBuilder>;
    nextButton?: ComponentFnOrBuilder<ButtonBuilder>;
    endButton?: ComponentFnOrBuilder<ButtonBuilder>;
    searchButton?: ComponentFnOrBuilder<ButtonBuilder>;
    collectorOptions?: PaginatedEmbedCollectorOptions;
    embedOnEnd?: EmbedFnOrBuilder;
};

export type PaginatedEmbedCollectorOptions =
    | Omit<MessageComponentCollectorOptions<ButtonInteraction>, "filter" | "componentType">
    | Omit<MessageCollectorOptions, "filter">;
