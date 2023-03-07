import type { ButtonBuilder } from "discord.js";
import { ButtonStyle } from "discord.js";
import type { BaseButtonContext } from "../contexts";
import type { Reify } from "../../utils";
import reify from "../../utils/reify";
import type { Guard } from "../Guard";

export abstract class Button {
    public readonly builder: ButtonBuilder;
    public readonly guards?: Guard[];

    protected constructor(options: ButtonOptions) {
        this.builder = reify.button(options.builder);
        this.guards = options.guards;
    }

    public abstract run(context: BaseButtonContext): Promise<void>;

    public get id() {
        if ("custom_id" in this.builder.data) {
            return this.builder.data.custom_id;
        }
    }
}

export type ButtonOptions = {
    builder: Reify<ButtonBuilder>;
    guards?: Guard[];
};