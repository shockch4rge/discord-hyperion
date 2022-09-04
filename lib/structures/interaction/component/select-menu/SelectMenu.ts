import { APIMessageComponentEmoji, SelectMenuBuilder } from "discord.js";

import { SelectMenuOptionBuilder } from "@discordjs/builders";

import { SelectMenuContext } from "../../../context/SelectMenuContext";
import { GuardFactory } from "../../../Guard";

export abstract class SelectMenu {
    public constructor(public readonly options: SelectMenuOptions) {}

    public abstract run(context: SelectMenuContext): Promise<void>;
}

export type SelectMenuOptions = {
    id: string;
    guards?: GuardFactory[];
};
