import { ButtonBuilder, ButtonStyle } from "discord.js";

import { ButtonContext } from "../../../context";
import { GuardFactory } from "../../../Guard";
import { Component } from "../Component";

export abstract class Button implements Component {
    public constructor(public readonly options: ButtonOptions) {}

    public abstract run(context: ButtonContext): Promise<void>;

    public build() {
        const { id, label, disabled = false, emoji } = this.options;
        const builder = new ButtonBuilder();

        builder.setCustomId(id);
        builder.setLabel(label);
        builder.setDisabled(disabled ?? false);
        emoji && builder.setEmoji(emoji);

        switch (this.options.style) {
            case "primary":
                builder.setStyle(ButtonStyle.Primary);
                break;
            case "secondary":
                builder.setStyle(ButtonStyle.Secondary);
                break;
            case "success":
                builder.setStyle(ButtonStyle.Success);
                break;
            case "danger":
                builder.setStyle(ButtonStyle.Danger);
                break;
            case "link":
                builder.setStyle(ButtonStyle.Link);
                builder.setURL(this.options.url);
                break;
            default:
                builder.setStyle(ButtonStyle.Primary);
        }

        return builder;
    }
}

export type BaseButtonOptions = {
    id: string;
    label: string;
    disabled?: boolean;
    emoji?: string;
    guards?: GuardFactory[];
};

export type ButtonOptions = BaseButtonOptions &
    (
        | LinkButtonOptions
        | {
              style?: "primary" | "secondary" | "success" | "danger";
          }
    );

export type LinkButtonOptions = {
    style?: "link";
    url: string;
};
