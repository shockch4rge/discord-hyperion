import { ComponentBuilder } from "discord.js";

export interface Component {
    build: (...args: any[]) => ComponentBuilder;
}
