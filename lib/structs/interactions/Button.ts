import type { ButtonBuilder } from "discord.js";
import type { ConcreteGuardConstructor } from "../Guard";
import type { BaseButtonContext } from "../contexts";
import type { Reify } from "../../utils";
import reify from "../../utils/reify";

export abstract class Button {
    public readonly id: string;
    public readonly builder: ButtonBuilder;
    public readonly guards?: ConcreteGuardConstructor[];

    protected constructor(options: ButtonOptions) {
        this.id = options.id!;
        this.builder = reify.button(options.builder);
        this.guards = options.guards;
    }

    public abstract run(context: BaseButtonContext): Promise<void>;
}

export type ButtonOptions = {
    id?: string;
    builder: Reify<ButtonBuilder>;
    guards?: ConcreteGuardConstructor[];
};