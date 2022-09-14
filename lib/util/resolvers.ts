import {
    ActionRowBuilder, AnyComponentBuilder, ButtonBuilder, ComponentBuilder, EmbedBuilder,
    SelectMenuBuilder
} from "discord.js";

import { EmbedFnOrBuilder } from "../structures/context";

export const resolveEmbed = (embed: EmbedFnOrBuilder) => {
    if (typeof embed === "function") {
        return embed(new EmbedBuilder());
    }

    return embed;
};

export const resolveComponentRow = (component: AnyComponentBuilder[]) => {
    return new ActionRowBuilder<any>().addComponents(component);
};

export const resolveButton = (builder: ComponentFnOrBuilder<ButtonBuilder>) => {
    if (typeof builder === "function") {
        return builder(new ButtonBuilder());
    }

    return builder;
};

export const resolveSelectMenu = (builder: ComponentFnOrBuilder<SelectMenuBuilder>) => {
    if (typeof builder === "function") {
        return builder(new SelectMenuBuilder());
    }
};

export type ComponentFnOrBuilder<T extends ComponentBuilder> = ((builder: T) => T) | T;
