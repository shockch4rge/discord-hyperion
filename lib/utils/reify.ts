import { ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import type { AnySelectMenuBuilder } from "../structs/interactions/SelectMenu";

const reifyEmbed = (embed: Reify<EmbedBuilder>) => {
    return typeof embed === "function" ? embed(new EmbedBuilder()) : embed;
};

const reifyButton = (button: Reify<ButtonBuilder>) => {
    return typeof button === "function" ? button(new ButtonBuilder()) : button;
};

const reifySelectMenu = (selectMenu: Reify<AnySelectMenuBuilder>) => {
    return typeof selectMenu === "function" ? selectMenu(new StringSelectMenuBuilder()) : selectMenu;
};

export type Reify<T> = T | ((t: T) => T);

export default {
    embed: reifyEmbed,
    button: reifyButton,
};