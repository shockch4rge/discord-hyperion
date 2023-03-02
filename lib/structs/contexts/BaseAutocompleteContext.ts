import { BaseContext } from "./BaseContext";
import type { ApplicationCommandOptionChoiceData, AutocompleteInteraction } from "discord.js";
import type { HyperionClient } from "../HyperionClient";
import { AutocompleteArgumentResolver } from "./BaseSlashCommandContext";

export class BaseAutocompleteContext<C extends HyperionClient = HyperionClient, DB = any> extends BaseContext<C, DB> {
    public readonly args: AutocompleteArgumentResolver;

    public constructor(
        client: C,
        public readonly interaction: AutocompleteInteraction,
    ) {
        super(client, interaction);
        this.args = new AutocompleteArgumentResolver(interaction);
    }

    public async respond(options: ApplicationCommandOptionChoiceData[]) {
        return this.interaction.respond(options);
    }
}

