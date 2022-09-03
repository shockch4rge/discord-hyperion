import { ComponentBuilder } from "discord.js";

export interface Component {
    build: () => ComponentBuilder;
}