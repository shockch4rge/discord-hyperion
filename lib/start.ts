import chalk from "chalk";
import { parseMessage } from "djs-message-commands";
import assert from "node:assert/strict";
import ora from "ora";

import { HyperionClient } from "./HyperionClient";
import { BaseSelectMenuContext } from "./structures/context";
import { CommandArgResolver } from "./structures/interaction/command";
import { HyperionError } from "./util/HyperionError";

export const start = async (client: HyperionClient) => {
    assert(client.commands, chalk.redBright`CommandRegistry not initialized.`);
    assert(client.buttons, chalk.redBright`ButtonRegistry not initialized.`);
    assert(client.selectMenus, chalk.redBright`SelectMenuRegistry not initialized.`);
    assert(client.modals, chalk.redBright`ModalRegistry not initialized.`);
    assert(client.events, chalk.redBright`EventRegistry not initialized.`);

    await client.commands.register();
    await client.buttons.register();
    await client.selectMenus.register();
    await client.modals.register();
    await client.events.register();

    client.on("ready", () => { });

    client.on("interactionCreate", async interaction => {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                throw new HyperionError(e => e.CommandNotFound, interaction.commandName);
            }

            if (!command.isSlashCommand()) return;

            await interaction.deferReply({
                ephemeral: command.options.ephemeral ?? true,
            });

            const context = new client.options.SlashCommandContext(
                client,
                interaction,
                new CommandArgResolver(interaction),
            );

            if (command.hasSubcommands()) {
                const subcommandName = interaction.options.getSubcommand();
                const subcommand = command.options.subcommands.get(subcommandName);

                if (!subcommand) {
                    throw new HyperionError(e => e.SubcommandNotFound, subcommandName);
                }

                try {
                    await subcommand.run(context);
                }
                catch (e) {
                    const error = e as Error;
                    client.logger.warn(error.message);
                    client.logger.warn(
                        `'${command.options.name}-${subcommand.options.name}' failed to run.`
                    );
                    return;
                }

                return;
            }

            for (const GuardFactory of command.options.guards ?? []) {
                const guard = new GuardFactory();

                try {
                    if (guard.slashRun) {
                        const passed = await guard.slashRun(context);
                        if (!passed) {
                            await guard.onSlashFail!(context);
                        }

                        return;
                    }

                    await interaction.editReply({
                        content: guard.options.message,
                    });
                    return;
                }
                catch (e) {
                    const error = e as Error;
                    client.logger.warn(error.message);
                    client.logger.warn(`'${command.options.name}' failed to run.`);
                    return;
                }
            }

            try {
                await command.slashRun(context);
            }
            catch (e) {
                const error = e as Error;
                client.logger.warn(error.message);
                client.logger.warn(`'${command.options.name}' failed to run: ${error}`);
                return;
            }

            return;

            return;
        }

        if (interaction.isContextMenuCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                throw new HyperionError(e => e.CommandNotFound, interaction.commandName);
            }

            if (!command.isContextMenuCommand()) return;

            const context = new client.options.ContextMenuCommandContext(interaction, client, interaction.guild);

            for (const GuardFactory of command.options.guards ?? []) {
                const guard = new GuardFactory();

                try {
                    if (guard.contextMenuRun) {
                        const passed = await guard.contextMenuRun(context);
                        if (!passed) {
                            await guard.contextMenuFail?.(context);
                            return;
                        }

                        await interaction.editReply({
                            content: guard.options.message,
                        });
                        return;
                    }
                }
                catch (e) {
                    const error = e as Error;
                    client.logger.warn(error.message);
                    client.logger.warn(`'${command.options.name}' failed to run.`);
                    return;
                }
            }

            try {
                await command.contextMenuRun(context);
            }
            catch (e) {
                const err = e as Error;
                client.logger.warn(
                    `Button '${command.options.name}' failed to run: ${err.stack}`
                );
                return;
            }
        }

        if (interaction.isButton()) {
            await interaction.deferUpdate();
            const button = client.buttons.get(interaction.customId);

            if (!button) {
                throw new HyperionError(e => e.ButtonNotFound, interaction.customId);
            }

            const context = new client.options.ButtonContext(client, interaction, interaction.guild);

            for (const GuardFactory of button.options.guards ?? []) {
                const guard = new GuardFactory();

                try {
                    if (guard.buttonRun) {
                        const passed = await guard.buttonRun(context);
                        if (!passed) {
                            await guard.buttonFail!(context);
                            return;
                        }

                        await interaction.editReply({
                            content: guard.options.message,
                        });
                        return;
                    }

                    await context.update(guard.options.message);
                }
                catch (e) {
                    const error = e as Error;
                    client.logger.warn(error.message);
                    client.logger.warn(`'${button.options.id}' failed to run.`);
                    return;
                }
            }

            try {
                await button.run(context);
            }
            catch (e) {
                const err = e as Error;
                client.logger.warn(`Button '${button.options.id}' failed to run: ${err.stack}`);
                return;
            }

            return;
        }

        if (interaction.isSelectMenu()) {
            const selectMenu = client.selectMenus.get(interaction.customId);

            if (!selectMenu) {
                throw new HyperionError(e => e.SelectMenuNotFound, interaction.customId);
            }

            const context = new client.options.SelectMenuContext(client, interaction);

            for (const GuardFactory of selectMenu.options.guards ?? []) {
                const guard = new GuardFactory();

                try {
                    if (guard.selectMenuRun) {
                        const passed = await guard.selectMenuRun(context);
                        if (!passed) {
                            await guard.selectMenuFail!(context);
                            return;
                        }
                    }

                    await interaction.editReply({
                        content: guard.options.message,
                    });
                    return;
                }
                catch (e) {
                    const error = e as Error;
                    client.logger.warn(error.message);
                    client.logger.warn(`'${selectMenu.options.id}' failed to run.`);
                    return;
                }
            }

            try {
                await selectMenu.run(context);
            }
            catch (e) {
                const err = e as Error;
                client.logger.warn(
                    `Modal ${selectMenu.options.id} failed to submit: ${err.stack}`
                );
                return;
            }

            return;
        }

        if (interaction.isModalSubmit()) {
            if (!interaction.isFromMessage()) return;

            const modal = client.modals.get(interaction.customId);

            if (!modal) {
                throw new HyperionError(e => e.ModalNotFound, interaction.customId);
            }

            const context = new client.options.ModalContext(client, interaction);

            try {
                await modal.run(context);
            }
            catch (e) {
                const error = e as Error;
                client.logger.warn(error.message);
                client.logger.warn(`Modal ${modal.options.id} failed to submit: ${error.stack}`);
            }
        }
    });

    client.on("messageCreate", async message => {
        if (message.author.bot) return;

        const { commandName, isPrefixed } = parseMessage({
            content: message.content,
            prefix: client.options.defaultPrefix,
        });

        console.log(commandName, isPrefixed);

        if (!isPrefixed) return;

        const command = client.commands.getMessageCommand(commandName);

        if (!command) {
            throw new HyperionError(e => e.CommandNotFound, commandName);
        }

        if (!command.isMessageCommand()) return;

        const [errors, args] = command.builder.validate(message);

        if (errors) {
            // TODO:
            console.log(errors);
            return;
        }

        const context = new client.options.MessageCommandContext(client, message, args, message.guild);

        try {
            await command.messageRun(context);
        }
        catch (e) {
            // TODO:
        }
    
    });

    const login = ora("Logging in...").start();
    await client.login(process.env.DISCORD_TOKEN);
    login.succeed(chalk.greenBright.bold`${client.options.name} is ready!`);
}