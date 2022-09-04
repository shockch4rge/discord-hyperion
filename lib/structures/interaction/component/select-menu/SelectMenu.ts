import { APIMessageComponentEmoji, SelectMenuBuilder } from "discord.js";

import { SelectMenuOptionBuilder } from "@discordjs/builders";

import { SelectMenuContext } from "../../../context/SelectMenuContext";
import { GuardFactory } from "../../../Guard";
import { Component } from "../Component";

export abstract class SelectMenu {
    public constructor(public readonly options: SelectMenuOptions) {}

    public abstract run(context: SelectMenuContext): Promise<void>;
}

export type SelectMenuOptions = {
    id: string;
    placeholder?: string;
    minValues?: number;
    maxValues?: number;
    disabled?: boolean;
    options?: SelectMenuOption[];
    guards?: GuardFactory[];
};

export type SelectMenuOption = {
    label: string;
    value: string;
    description?: string;
    emoji?: APIMessageComponentEmoji;
    isDefault?: boolean;
};
