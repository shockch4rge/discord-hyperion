import {
    AnyComponentBuilder, Client, EmbedBuilder, Guild, InteractionReplyOptions,
    InteractionUpdateOptions
} from "discord.js";

import { TritonClient } from "../../TritonClient";
import { Modify } from "../../util/types";

export abstract class Context<C extends Client = TritonClient> {
    public constructor(public readonly client: C, public readonly guild: Guild | null) {}
}

export type ReplyInteractionOptions =
    | string
    | EmbedBuilder
    | Modify<
          InteractionReplyOptions,
          {
              embeds?: EmbedFnOrBuilder[];
              components?: AnyComponentBuilder[][];
          }
      >;

export type UpdateInteractionOptions =
    | string
    | EmbedBuilder
    | Modify<
          InteractionUpdateOptions,
          {
              embeds?: EmbedFnOrBuilder[];
              components?: AnyComponentBuilder[][];
          }
      >;

export type EmbedFnOrBuilder = ((embed: EmbedBuilder) => EmbedBuilder) | EmbedBuilder;
