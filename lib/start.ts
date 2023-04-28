import type { BaseSlashCommandContext, Guard, HyperionClient } from "./structs";
import "dotenv/config";

import {
    ChannelType, codeBlock, Events, inlineCode, PermissionsBitField, userMention
} from "discord.js";
import { tri } from "try-v2";
import { z } from "zod";

import { Embeds } from "./builtins";
import {
    ButtonRegistry, CommandRegistry, EventRegistry, ModalRegistry, SelectMenuRegistry
} from "./registries";
import { color, HyperionError, INVIS_SPACE } from "./utils";

import type { EmbedBuilder, EmbedField, Guild, GuildChannelCreateOptions, TextChannel, User } from "discord.js";
import ora from "ora";
export const start = async (client: HyperionClient, options: StartOptions) => {
    const [envValidationError, env] = await tri(validateProcess.parseAsync(process.env))

    if (envValidationError) {
        return;
    }

    const commands = new CommandRegistry(client, options.devGuildIds ?? []);
    await commands.register();
    Reflect.set(client, "commands", commands);

    const buttons = new ButtonRegistry(client);
    await buttons.register();
    Reflect.set(client, "buttons", buttons);

    const selectMenus = new SelectMenuRegistry(client);
    await selectMenus.register();
    Reflect.set(client, "selectMenus", selectMenus);

    const modals = new ModalRegistry(client);
    await modals.register();
    Reflect.set(client, "modals", modals);

    const events = new EventRegistry(client);
    await events.register();
    Reflect.set(client, "events", events);

    const channelLogging = options.channelLogging;

    client.on(Events.InteractionCreate, async interaction => {
        const user = interaction.user;

        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                throw new HyperionError(e => e.CommandNotFound(interaction.commandName));
            }

            if (!command.isSlashCommand()) return;

            await interaction.deferReply({
                ephemeral: command.ephemeral ?? true,
            });

            const logCommand = shouldLogById(channelLogging?.include.commands, command.builder.name);
            const context: BaseSlashCommandContext = new client.contexts.SlashCommandContext(client, interaction);

            if (command.hasSubcommands()) {
                const subcommandName = context.args.subcommand();
                const subcommand = command.subcommands.get(subcommandName);
                const logSubcommand = shouldLogById(channelLogging?.include.subcommands, subcommandName);

                if (!subcommand) {
                    throw new HyperionError(e => e.SubcommandNotFound(subcommandName));
                }

                for (const guard of subcommand.guards ?? []) {
                    const logGuard = shouldLogById(channelLogging?.include.guards, guard.name);
                    const passed = await guard.slashRun!(context);

                    if (!passed) {
                        if (guard.slashFail) {
                            await guard.slashFail(context);
                        }
                        else {
                            await context.reply(guard.description);
                        }

                        if (!logGuard) return;

                        await client.logger.info({
                            message: `Guard triggered`,
                            embeds: message => [
                                buildLogEmbed({
                                    user,
                                    guard,
                                    message,
                                    embed: Embeds.Neutral(),
                                    fields: [
                                        { name: "Command", value: inlineCode(command.builder.name) },
                                        { name: "Subcommand", value: inlineCode(subcommand.builder.name) },
                                    ]
                                }),
                            ]
                        });
                        return;
                    }

                }

                const [error] = await tri(subcommand.run(context));

                if (!logSubcommand || !error) return;

                if (error) {
                    await client.logger.warn({
                        message: `Failed to run subcommand`,
                        embeds: message => [
                            buildLogEmbed({
                                user,
                                error,
                                message,
                                embed: Embeds.Warning(),
                                fields: [
                                    { name: "Subcommand", value: subcommand.builder.name },
                                    { name: "Command", value: command.builder.name },
                                ]
                            })
                        ],
                    });
                    return;
                }

                await client.logger.info({
                    message: `Ran subcommand`,
                    embeds: message => [
                        buildLogEmbed({
                            user,
                            message,
                            embed: Embeds.Success(),
                            fields: [
                                { name: "Subcommand", value: subcommand.builder.name },
                                { name: "Command", value: command.builder.name },
                            ]
                        })
                    ],
                });
                return;
            }

            for (const guard of command.guards ?? []) {
                const logGuard = shouldLogById(channelLogging?.include.guards, guard.name);
                const passed = await guard.slashRun!(context);

                if (!passed) {
                    if (guard.slashFail) {
                        await guard.slashFail(context);
                    }
                    else {
                        await context.reply(guard.description);
                    }

                    if (!logGuard) return;

                    await client.logger.info({
                        message: `Guard triggered`,
                        embeds: message => [
                            buildLogEmbed({
                                user,
                                message,
                                guard,
                                embed: Embeds.Neutral(),
                                fields: [{ name: "Command", value: command.builder.name }],
                            })
                        ]
                    });
                    return;
                }
            }

            const [error] = await tri(command.slashRun(context));

            if (!logCommand) return;

            if (error) {
                await client.logger.warn({
                    message: `Failed to run command`,
                    embeds: message => [
                        buildLogEmbed({
                            user,
                            error,
                            message,
                            embed: Embeds.Warning(),
                            fields: [{ name: "Command", value: command.builder.name }],
                        })
                    ],
                });
                return;
            }

            await client.logger.info({
                message: `Ran command`,
                embeds: message => [
                    buildLogEmbed({
                        user,
                        message,
                        embed: Embeds.Success(),
                        fields: [{ name: "Command", value: command.builder.name }],
                    })
                ],
            });
            return;
        }

        if (interaction.isButton()) {
            const buttonId = interaction.customId;
            const button = client.buttons.get(buttonId);

            if (!button) {
                throw new HyperionError(e => e.ButtonNotFound(buttonId));
            }

            const logButton = shouldLogById(channelLogging?.include?.buttons, buttonId);
            const context = new client.contexts.ButtonContext(client, interaction);

            for (const guard of button.guards ?? []) {
                const logGuard = shouldLogById(channelLogging?.include.guards, guard.name);
                const passed = await guard.buttonRun!(context);

                if (!passed) {
                    if (guard.buttonFail) {
                        await guard.buttonFail(context);
                    }
                    else {
                        await context.update(guard.description);
                    }

                    if (!logGuard) return;

                    await client.logger.info({
                        message: `Guard triggered`,
                        embeds: message => [
                            buildLogEmbed({
                                user,
                                guard,
                                message,
                                embed: Embeds.Neutral(),
                                fields: [{ name: "Button", value: buttonId }],
                            })
                        ]
                    });
                    return;
                }
            }

            const [error] = await tri(button.run(context));

            if (!logButton) return;

            if (error) {
                await client.logger.warn({
                    message: `Failed to run button`,
                    embeds: message => [
                        buildLogEmbed({
                            user,
                            error,
                            message,
                            embed: Embeds.Warning(),
                            fields: [{ name: "Button", value: buttonId }],
                        })
                    ],
                });
                return;
            }

            await client.logger.info({
                message: `Ran button`,
                embeds: message => [
                    buildLogEmbed({
                        user,
                        message,
                        embed: Embeds.Success(),
                        fields: [{ name: "Button", value: buttonId }],
                    })
                ],
            });
            return;
        }

        if (interaction.isAnySelectMenu()) {
            const selectMenuId = interaction.customId;
            const selectMenu = client.selectMenus.get(selectMenuId);

            if (!selectMenu) {
                throw new HyperionError(e => e.SelectMenuNotFound(selectMenuId));
            }

            if (interaction.componentType !== selectMenu.builder.data.type) return;

            const logSelectMenu = shouldLogById(channelLogging?.include?.selectMenus, selectMenuId);
            const context = new client.contexts.SelectMenuContext(client, interaction);

            for (const guard of selectMenu.guards ?? []) {
                const logGuard = shouldLogById(channelLogging?.include?.guards, guard.name);
                const passed = await guard.selectMenuRun!(context);

                if (!passed) {
                    if (guard.selectMenuFail) {
                        await guard.selectMenuFail(context);
                    }
                    else {
                        await context.update(guard.description);
                    }

                    if (!logGuard) return;

                    await client.logger.info({
                        message: `Guard triggered`,
                        embeds: message => [
                            buildLogEmbed({
                                user,
                                guard,
                                message,
                                embed: Embeds.Neutral(),
                                fields: [{ name: "Select Menu", value: selectMenuId }],
                            }),
                        ]
                    });
                    return;
                }
            }

            const [error] = await tri(selectMenu.run(context));

            if (!logSelectMenu) return;

            if (error) {
                await client.logger.warn({
                    message: `Failed to run select menu [${selectMenuId}]`,
                    embeds: message => [
                        buildLogEmbed({
                            user,
                            error,
                            message,
                            embed: Embeds.Warning(),
                            fields: [
                                { name: "Select Menu", value: selectMenuId },
                                { name: "Type", value: interaction.componentType.toString() }
                            ],
                        })
                    ],
                });
                return;
            }

            await client.logger.info({
                message: `Ran select menu [${selectMenuId}]`,
                embeds: message => [
                    buildLogEmbed({
                        user,
                        message,
                        embed: Embeds.Success(),
                        fields: [
                            { name: "Select Menu", value: selectMenuId },
                            { name: "Type", value: interaction.componentType.toString() },
                        ],
                    })
                ],
            });

            return;
        }

        if (interaction.isModalSubmit()) {
            if (!interaction.isFromMessage()) return;

            const modalId = interaction.customId;
            const modal = client.modals.get(modalId);

            if (!modal) {
                throw new HyperionError(e => e.ModalNotFound(modalId));
            }

            const logModal = shouldLogById(channelLogging?.include?.modals, modalId);
            const context = new client.contexts.ModalContext(client, interaction);

            const [error] = await tri(modal.run(context));

            if (!logModal) return;

            if (error) {
                await client.logger.warn({
                    message: `Failed to run modal`,
                    embeds: message => [
                        buildLogEmbed({
                            user,
                            message,
                            error,
                            embed: Embeds.Warning(),
                            fields: [{ name: "Modal", value: modalId }],
                        }),
                    ],
                });
                return;
            }

            await client.logger.info({
                message: `Ran modal`,
                embeds: message => [
                    buildLogEmbed({
                        user,
                        message,
                        embed: Embeds.Success(),
                        fields: [{ name: "Modal", value: modalId }],
                    })
                ],
            });

            return;
        }

        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) return;

            const logAutocomplete = shouldLogById(channelLogging?.include?.autocompletes, command.builder.name);
            const context = new client.contexts.AutocompleteContext(client, interaction);

            const [error] = await tri(command.autocompleteRun!(context));

            if (!logAutocomplete) return;

            if (error) {
                await client.logger.warn({
                    message: `Failed to run autocomplete`,
                    embeds: message => [
                        buildLogEmbed({
                            user,
                            message,
                            error,
                            embed: Embeds.Warning(),
                            fields: [{ name: "Command", value: command.builder.name }],
                        }),
                    ],
                });
                return;
            }

            await client.logger.info({
                message: `Ran autocomplete`,
                embeds: message => [
                    buildLogEmbed({
                        user,
                        message,
                        embed: Embeds.Success(),
                        fields: [{ name: "Command", value: command.builder.name }],
                    }),
                ],
            });
        }
    });

    if (channelLogging) {
        const {
            onChannelCreate,
            onChannelDelete,
            buildChannelOptions = (guild: Guild) => ({
                name: "logs",
                type: ChannelType.GuildText,
                reason: `Created #logs channel for ${client.name}. Defaulted to administrators-only.`,
                permissionOverwrites: [{
                    id: guild.id,
                    allow: [PermissionsBitField.Flags.Administrator],
                }]
            }),
        } = channelLogging;

        client.on("guildCreate", async guild => {
            const channel = await guild.channels.create(buildChannelOptions(guild));
            await onChannelCreate?.(guild, channel);
        });

        client.on("guildDelete", async guild => {
            const channel = guild.channels.cache.find(c => c.name === "logs") as TextChannel | undefined;
            if (!channel) return;

            await channel.delete();
            await onChannelDelete?.(guild, channel);
        });
    }

    const loginProgress = ora({
        text: color(c => c.magenta`Logging in...`),
    }).start();

    const [loginError] = await tri(client.login(process.env.CLIENT_TOKEN));

    if (loginError) {
        loginProgress.fail(`Error logging in.`)
        return;
    }

    loginProgress.succeed(
        color(c => c.magenta`${client.name} is logged in!`)
    );
};

interface StartOptions {
    channelLogging: ChannelLoggingOptions;
    devGuildIds?: string[];
}

interface ChannelLoggingOptions {
    onChannelCreate?: (guild: Guild, channel: TextChannel) => Promise<void>;
    onChannelDelete?: (guild: Guild, channel: TextChannel) => Promise<void>;
    buildChannelOptions?: (guild: Guild) => GuildChannelCreateOptions;
    include: Partial<Record<
        "autocompletes" | "buttons" | "commands" | "guards" | "modals" | "selectMenus" | "subcommands",
        IncludeOrExclude
    >>;
}

type IncludeOrExclude = "all" | "none" | {
    except: string[];
};

export const shouldLogById = <T>(options: IncludeOrExclude | undefined, id: string) => {
    if (!options) return true;

    if (options === "all") return true;
    if (options === "none") return false;

    return !options.except.includes(id);
};

type LogEmbedTemplate = {
    embed: EmbedBuilder;
    message: string;
    user: User;
    fields: Array<Omit<EmbedField, "inline">>;
    error?: Error;
    guard?: Guard;
};

export const buildLogEmbed = (template: LogEmbedTemplate) => {
    const { embed, user, message, fields, error, guard } = template;

    embed
        .setAuthor({
            name: user.tag,
            iconURL: user.displayAvatarURL(),
        })
        .setTitle(message)
        .addFields(
            { name: "User", value: userMention(user.id) },
            ...fields.map(f => ({ ...f, value: inlineCode(f.value) }))
        )
        .setTimestamp(new Date());

    if (guard) {
        embed.addFields({ name: "Guard", value: inlineCode(guard.name) });
    }

    if (error) {
        embed
            .addFields({ name: "Error", value: INVIS_SPACE })
            .setDescription(codeBlock("js", `${error.message}\n${error.stack ?? ""}`));
    }

    return embed;
};

export const validateProcess = z.object({
    CLIENT_ID: z.string(),
    CLIENT_TOKEN: z.string(),
    NODE_ENV: z.string(),
})