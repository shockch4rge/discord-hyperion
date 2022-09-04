import {
    AnyComponentBuilder, Client, EmbedBuilder, Guild, InteractionReplyOptions,
    InteractionUpdateOptions
} from "discord.js";

import { TritonClient } from "../../TritonClient";

export abstract class Context<C extends Client = TritonClient> {
    public constructor(public readonly client: C, public readonly guild: Guild | null) {}
}

export type ReplyInteractionOptions =
    | string
    | EmbedBuilder
    | (Omit<InteractionReplyOptions, "components" | "embeds"> & {
          embeds?: ((embed: EmbedBuilder) => EmbedBuilder)[];
          components?: AnyComponentBuilder[][];
      });

export type UpdateInteractionOptions =
    | string
    | EmbedBuilder
    | (Omit<InteractionUpdateOptions, "components" | "embeds"> & {
          embeds?: ((embed: EmbedBuilder) => EmbedBuilder)[];
          components?: AnyComponentBuilder[][];
      });
