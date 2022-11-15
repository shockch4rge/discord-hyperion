import {
    AnyComponentBuilder, EmbedBuilder, Guild, InteractionReplyOptions, InteractionUpdateOptions,
    MessageReplyOptions
} from "discord.js";

import { HyperionClient } from "../../HyperionClient";
import { Modify } from "../../util/types";

export abstract class BaseContext<C extends HyperionClient = HyperionClient> {
    public constructor(public readonly client: C, public readonly guild: Guild | null) { }

    protected isEmbedBuildable(
        options: AltInteractionReplyOptions | AltInteractionUpdateOptions | AltMessageReplyOptions
    ): options is EmbedFnOrBuilder {
        return typeof options === "function" || options instanceof EmbedBuilder;
    }
}

export type AltInteractionReplyOptions = EmbedFnOrBuilder | ModifiedInteractionReplyOptions | string;

export type AltInteractionUpdateOptions = EmbedFnOrBuilder | ModifiedInteractionUpdateOptions | string;

export type AltMessageReplyOptions = EmbedBuilder | MessageReplyOptions | string;

export type ModifiedInteractionReplyOptions = Modify<
    InteractionReplyOptions,
    {
        embeds?: EmbedFnOrBuilder[];
        components?: AnyComponentBuilder[][];
    }
>;

export type ModifiedInteractionUpdateOptions = Modify<
    InteractionUpdateOptions,
    {
        embeds?: EmbedFnOrBuilder[];
        components?: AnyComponentBuilder[][];
    }
>;

export type EmbedFnOrBuilder = EmbedBuilder | ((embed: EmbedBuilder) => EmbedBuilder);
