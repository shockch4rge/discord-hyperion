import type {
    ChannelSelectMenuBuilder,
    MentionableSelectMenuBuilder,
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder
} from "discord.js";
import type { BaseSelectMenuContext } from "../contexts";
import type { Guard } from "../Guard";

export abstract class SelectMenu {
    public readonly id: string;
    public readonly builder: AnySelectMenuBuilder;
    public readonly guards?: Guard[];

    protected constructor(options: SelectMenuOptions) {
        this.id = options.id!;
        this.builder = options.builder;
        this.guards = options.guards;
    }

    public abstract run(context: BaseSelectMenuContext): Promise<void>;
}

export type SelectMenuOptions = {
    id?: string;
    builder: AnySelectMenuBuilder;
    guards?: Guard[];
};

export type AnySelectMenuBuilder =
    | ChannelSelectMenuBuilder
    | MentionableSelectMenuBuilder
    | RoleSelectMenuBuilder
    | StringSelectMenuBuilder
    | UserSelectMenuBuilder;