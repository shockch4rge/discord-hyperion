import type { BaseButtonContext, BaseSelectMenuContext, BaseSlashCommandContext, Command } from "../structs";
import type { InteractionReplyOptions, InteractionUpdateOptions } from "discord.js";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Colors,
    ComponentType,
    EmbedBuilder,
    StringSelectMenuBuilder
} from "discord.js";
import { buildNumberEmoji, Time } from "../utils";

export abstract class SharedPaginatedEmbedMethods {

    protected constructor(public readonly pages: EmbedBuilder[], public index = 0) {}

    public toNextPage() {
        if (this.onLastPage) return;

        this.index++;

        return this.pages[this.index];
    }

    public toLastPage() {
        if (this.onLastPage) return;

        this.index = this.pages.length - 1;

        return this.pages[this.index];
    }

    public toPreviousPage() {
        if (this.onFirstPage) return;

        this.index--;

        return this.pages[this.index];
    }

    public toFirstPage() {
        this.index = 0;

        return this.pages[this.index];
    }

    public get onFirstPage() {
        return this.index === 0;
    }

    public get onLastPage() {
        return this.index === this.pages.length - 1;
    }

    public get currentPage() {
        return this.pages[this.index];
    }
}

class Help extends SharedPaginatedEmbedMethods {
    private sent = false;

    private componentIds = {
        start: "hyperion__help_start",
        end: "hyperion__help_end",
        next: "hyperion__help_next",
        previous: "hyperion__help_previous",
        commandSelect: "hyperion__help_command_select"
    } as const;

    private readonly components = {
        navigateStart: () => new ButtonBuilder()
            .setCustomId(this.componentIds.start)
            .setEmoji("⏮️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(this.onFirstPage),

        navigateEnd: () => new ButtonBuilder()
            .setCustomId(this.componentIds.end)
            .setEmoji("⏭️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(this.onLastPage),

        navigateNext: () => new ButtonBuilder()
            .setCustomId(this.componentIds.next)
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(this.onLastPage),

        navigatePrevious: () => new ButtonBuilder()
            .setCustomId(this.componentIds.previous)
            .setEmoji("◀️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(this.onFirstPage),

        commandSelect: () => {
            const commands = Help.filterHiddenCommands(this.context, this.options);
            const keys = Array.from(commands.keys());

            return new StringSelectMenuBuilder()
                .setCustomId(this.componentIds.commandSelect)
                .setPlaceholder("Select a command!")
                .addOptions(
                    commands.map((command, key) => {
                        const index = keys.findIndex(k => k === key);
                        return {
                            label: command.builder.name,
                            value: command.builder.name,
                            description: command.builder.description,
                            emoji: buildNumberEmoji(index),
                        };
                    })
                );
        },
    };

    public constructor(
        public readonly context: BaseButtonContext | BaseSelectMenuContext | BaseSlashCommandContext,
        public readonly options?: PaginatedHelpEmbedOptions,
    ) {
        super(Help.buildPages(context, options), Help.buildInitialIndex(context, options));
    }

    private buildUpdateOptions(): Pick<InteractionReplyOptions | InteractionUpdateOptions, "components" | "embeds"> {
        return {
            embeds: [this.currentPage],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        this.components.navigateStart(),
                        this.components.navigatePrevious(),
                        this.components.navigateNext(),
                        this.components.navigateEnd(),
                    ),
                new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(this.components.commandSelect()),
            ],
        };
    }

    public async send() {
        // avoid duplicating messages
        if (this.sent) {
            console.warn("Avoid calling send() on a PaginatedEmbed more than once.");
            return;
        }

        const helpMessage = await this.context.interaction.followUp({
            ephemeral: this.options?.ephemeral ?? true,
            ...this.buildUpdateOptions(),
        });

        const buttonCollector = helpMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === this.context.interaction.user.id && i.message.id === helpMessage.id,
            time: Time.minutes(10),
        });

        const menuCollector = helpMessage.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === this.context.interaction.user.id && i.message.id === helpMessage.id,
            time: Time.minutes(10),
        });

        buttonCollector.on("collect", async interaction => {
            switch (interaction.customId) {
                case this.componentIds.start:
                    this.toFirstPage();
                    break;
                case this.componentIds.end:
                    this.toLastPage();
                    break;
                case this.componentIds.next:
                    this.toNextPage();
                    break;
                case this.componentIds.previous:
                    this.toPreviousPage();
                    break;
                default:
                    return;
            }

            await interaction.update(this.buildUpdateOptions());
        });

        menuCollector.on("collect", async interaction => {
            const commands = this.context.client.commands;
            const commandName = commands.get(interaction.values[0])!.builder.name;

            this.index = commands.findIndex(c => c.builder.name === commandName);

            await interaction.update(this.buildUpdateOptions());
        });

        buttonCollector.on("end", async interactions => {
            menuCollector.stop();
            await helpMessage.delete();
        });

        this.sent = true;
    }

    private static buildPages(...args: ConstructorParameters<typeof this>) {
        const [context, options] = args;
        const { introPage } = options ?? {};

        const commands = this.filterHiddenCommands(...args);
        const keys = Array.from(commands.keys());

        const pages = commands.map((command, key) => {
            const keyIndex = keys.findIndex(k => k === key);

            return new EmbedBuilder()
                .setAuthor({
                    name: `❓ Help`,
                    iconURL: context.client.user!.avatarURL() ?? undefined,
                })
                .setTitle(command.builder.name)
                .setDescription(command.detailedDescription ?? command.builder.description)
                .addFields(command.builder.options.map(o => {
                    const option = o.toJSON();
                    return {
                        name: option.name,
                        value: option.description,
                        inline: true,
                    };
                }))
                .setColor(Colors.DarkGrey)
                .setFooter({ text: `Page ${keyIndex + 2}/${commands.size + 1}` });
        });

        pages.unshift(introPage ??
            new EmbedBuilder()
                .setAuthor({
                    name: `❓ Help`,
                    iconURL: context.client.user!.avatarURL() ?? undefined
                })
                .setDescription([
                    `Welcome to ${context.client.name}'s help menu!`,
                    `The pages in this embed explain what each command does, who can use it and where/how to use it.`,
                    `Use the dropdown menu or arrow buttons to navigate through them!`,
                ].join("\n"))
                .setColor(Colors.DarkGrey)
                .setFooter({ text: `Page 1/${commands.size + 1}` })
        );

        return pages;
    }

    private static buildInitialIndex(...args: ConstructorParameters<typeof this>) {
        const [context, options] = args;
        const { initialPage } = options ?? {};

        if (!initialPage) return 0;

        if (typeof initialPage === "number" && !Number.isInteger(initialPage)) {
            throw new Error("initialPage must be an integer or a function that returns a boolean");
        }

        return typeof initialPage === "number"
            ? initialPage
            : context.client.commands.findIndex(initialPage);
    }

    private static filterHiddenCommands(...args: ConstructorParameters<typeof this>) {
        const [context, options] = args;

        return options?.hideCommand
            ? context.client.commands.filter(options.hideCommand)
            : context.client.commands;
    }
}

export type PaginatedHelpEmbedOptions = {
    introPage?: EmbedBuilder;
    ephemeral?: boolean;
    initialPage?: number | ((command: Command) => boolean);
    hideCommand?: (command: Command) => boolean;
};

const PaginatedEmbed = {
    Help,
};

export default PaginatedEmbed;