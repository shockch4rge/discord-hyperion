import type { HyperionClient } from "./structs";
import assert from "node:assert/strict";
import { ButtonRegistry, CommandRegistry, ModalRegistry, SelectMenuRegistry } from "./registries";
import { color, HyperionError } from "./utils";
import { Events } from "discord.js";

import "dotenv/config";
import { EventRegistry } from "./registries/EventRegistry";
import { tri } from "try-v2";

export const start = async (client: HyperionClient, options: StartOptions) => {
    assert(
        process.env.CLIENT_TOKEN,
        color(
            c => c.redBright`You must provide a`,
            c => c.cyanBright`'CLIENT_TOKEN'`,
            c => c.redBright`variable in your .env file.`,
        )
    );
    assert(
        process.env.CLIENT_ID,
        color(
            c => c.redBright`You must provide a`,
            c => c.cyanBright`'CLIENT_ID'`,
            c => c.redBright`variable in your .env file.`,
        )
    );

    const commands = new CommandRegistry(client, {
        devGuildIds: options.devGuildIds ?? [],
    });
    await commands.register();
    assert(Reflect.set(client, "commands", commands));

    const buttons = new ButtonRegistry(client);
    await buttons.register();
    assert(Reflect.set(client, "buttons", buttons));

    const selectMenus = new SelectMenuRegistry(client);
    await selectMenus.register();
    assert(Reflect.set(client, "selectMenus", selectMenus));

    const modals = new ModalRegistry(client);
    await modals.register();
    assert(Reflect.set(client, "modals", modals));

    const events = new EventRegistry(client);
    await events.register();
    assert(Reflect.set(client, "events", events));

    client.on(Events.InteractionCreate, async interaction => {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                throw new HyperionError(e => e.CommandNotFound(interaction.commandName));
            }

            if (!command.isSlashCommand()) return;

            await interaction.deferReply({
                ephemeral: command.ephemeral ?? true,
            });

            const context = new client.contexts.SlashCommandContext(client, interaction);

            if (command.hasSubcommands()) {
                const subcommandName = context.args.subcommand();
                const subcommand = command.subcommands.get(subcommandName);

                if (!subcommand) {
                    throw new HyperionError(e => e.SubcommandNotFound(subcommandName));
                }

                const [error] = await tri(() => subcommand.run(context));

                if (error) {
                    return;
                }

                return;
            }

            for (const guard of command.guards ?? []) {
                const passed = await guard.slashRun!(context);

                if (!passed) {
                    if (guard.slashFail) {
                        await guard.slashFail(context);
                    }
                    else {
                        await context.reply(guard.description);
                    }

                    return;
                }
            }

            const [error] = await tri(command.slashRun(context));

            if (error) {
                return;
            }

            return;
        }

        if (interaction.isButton()) {
            const button = client.buttons.get(interaction.customId);

            if (!button) {
                throw new HyperionError(e => e.ButtonNotFound(interaction.customId));
            }

            const context = new client.contexts.ButtonContext(client, interaction);

            for (const guard of button.guards ?? []) {
                const passed = await guard.buttonRun!(context);

                if (!passed) {
                    if (guard.buttonFail) {
                        await guard.buttonFail(context);
                    }
                    else {
                        await context.update(guard.description);
                    }

                    return;
                }
            }

            const [error] = await tri(button.run(context));

            if (error) {
                return;
            }

            return;
        }

        if (interaction.isAnySelectMenu()) {
            const selectMenu = client.selectMenus.get(interaction.customId);

            if (!selectMenu) {
                throw new HyperionError(e => e.SelectMenuNotFound(interaction.customId));
            }

            if (interaction.componentType !== selectMenu.builder.data.type) return;

            const context = new client.contexts.SelectMenuContext(client, interaction);

            for (const guard of selectMenu.guards ?? []) {
                const passed = await guard.selectMenuRun!(context);

                if (!passed) {
                    if (guard.selectMenuFail) {
                        await guard.selectMenuFail(context);
                    }
                    else {
                        await context.update(guard.description);
                    }

                    return;
                }
            }

            const [error] = await tri(selectMenu.run(context));

            if (error) {
                return;
            }

            return;
        }

        if (interaction.isModalSubmit()) {
            if (!interaction.isFromMessage()) return;

            const modal = client.modals.get(interaction.customId);

            if (!modal) {
                throw new HyperionError(e => e.ModalNotFound(interaction.customId));
            }

            const context = new client.contexts.ModalContext(client, interaction);

            // for (const GuardFactory of modal.guards ?? []) {
            //     const guard = new GuardFactory();
            //
            //     const passed = await guard.modalRun!(context);
            //
            //     if (!passed) {
            //         if (guard.modalFail) {
            //             await guard.modalFail(context);
            //         }
            //         else {
            //             await context.update(guard.description);
            //         }
            //
            //         return;
            //     }
            // }

            const [error] = await tri(modal.run(context));

            if (error) {
                return;
            }

            return;
        }

        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) return;

            const context = new client.contexts.AutocompleteContext(client, interaction);

            const [error] = await tri(command.autocompleteRun!(context));

            if (error) {
                
            }
        }
    });

    await client.login(process.env.CLIENT_TOKEN);
};

interface StartOptions {
    devGuildIds?: string[];
}