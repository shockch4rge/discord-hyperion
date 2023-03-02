import type {
    ChannelSelectMenuBuilder,
    MentionableSelectMenuBuilder,
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder
} from "discord.js";
import type { ConcreteGuardConstructor } from "../Guard";
import type { BaseSelectMenuContext } from "../contexts";

export abstract class SelectMenu {
    public readonly id: string;
    public readonly builder: AnySelectMenuBuilder;
    public readonly guards?: ConcreteGuardConstructor[];

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
    guards?: ConcreteGuardConstructor[];
};

export type AnySelectMenuBuilder =
    | ChannelSelectMenuBuilder
    | MentionableSelectMenuBuilder
    | RoleSelectMenuBuilder
    | StringSelectMenuBuilder
    | UserSelectMenuBuilder;