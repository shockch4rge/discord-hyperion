import {
    AnyComponentBuilder, Client, EmbedBuilder, Guild, InteractionReplyOptions,
    InteractionUpdateOptions
} from "discord.js";

import { TritonClient } from "../../TritonClient";
import { Modify } from "../../util/types";

export abstract class Context<C extends TritonClient = TritonClient> {
    public constructor(public readonly client: C, public readonly guild: Guild | null) {}

    protected isEmbedBuildable(lol: unknown): lol is EmbedFnOrBuilder {
        return typeof lol === "function" || lol instanceof EmbedBuilder;
    }
}

export type AltInteractionReplyOptions =
    | string
    | EmbedFnOrBuilder
    | ModifiedInteractionReplyOptions;

export type AltInteractionUpdateOptions =
    | string
    | EmbedFnOrBuilder
    | ModifiedInteractionUpdateOptions;

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

export type EmbedFnOrBuilder = ((embed: EmbedBuilder) => EmbedBuilder) | EmbedBuilder;
