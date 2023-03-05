import type { ButtonBuilder } from "discord.js";
import type { BaseButtonContext } from "../contexts";
import type { Reify } from "../../utils";
import reify from "../../utils/reify";
import type { Guard } from "../Guard";

export abstract class Button {
    public readonly id: string;
    public readonly builder: ButtonBuilder;
    public readonly guards?: Guard[];

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
    guards?: Guard[];
};