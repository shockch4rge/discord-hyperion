import type {
    EmbedBuilder,
    Guild,
    Interaction,
    InteractionReplyOptions,
    InteractionUpdateOptions,
    MessageActionRowComponentBuilder,
    User
} from "discord.js";
import type { Modify, Reify } from "../../utils";
import type { HyperionClient } from "../HyperionClient";

export abstract class BaseContext<C extends HyperionClient, DB> {
    public readonly guild: Guild | null;
    public readonly user: User;

    protected constructor(public readonly client: C, interaction: Interaction) {
        this.guild = interaction.guild;
        this.user = interaction.user;
    }

    public get db() {
        return this.client.db as DB;
    }

    public get logger() {
        return this.client.logger;
    }
}

export type AltReplyOptions = ModifiedReplyOptions | Reify<EmbedBuilder> | string;

export type ModifiedReplyOptions = Modify<InteractionReplyOptions, {
    embeds?: Array<Reify<EmbedBuilder>>;
    components?: MessageActionRowComponentBuilder[][];
}>;

export type AltUpdateOptions = ModifiedUpdateOptions | Reify<EmbedBuilder> | string;

export type ModifiedUpdateOptions = Modify<InteractionUpdateOptions, {
    embeds?: Array<Reify<EmbedBuilder>>;
    components?: MessageActionRowComponentBuilder[][];
}>;