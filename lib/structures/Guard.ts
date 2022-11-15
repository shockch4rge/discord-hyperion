import {
    BaseButtonContext, BaseContextMenuCommandContext, BaseMessageCommandContext,
    BaseSlashCommandContext, HybridContextMenuCommandInteraction
} from "./context";
import { BaseSelectMenuContext } from "./context/BaseSelectMenuContext";

export abstract class Guard {
    public readonly options: GuardOptions;

    public constructor({ name, message }: GuardOptions) {
        this.options = {
            name: name ?? this.constructor.name,
            message,
        };
    }

    public slashRun?(context: BaseSlashCommandContext): Promise<boolean>;

    public onSlashFail?(context: BaseSlashCommandContext): Promise<void>;

    public contextMenuRun?(context: BaseContextMenuCommandContext): Promise<boolean>;

    public contextMenuFail?(context: BaseContextMenuCommandContext): Promise<void>;

    public buttonRun?(context: BaseButtonContext): Promise<boolean>;

    public buttonFail?(context: BaseButtonContext): Promise<void>;

    public selectMenuRun?(context: BaseSelectMenuContext): Promise<boolean>;

    public selectMenuFail?(context: BaseSelectMenuContext): Promise<void>;

    public messageRun?(context: BaseMessageCommandContext): Promise<boolean>;
}

export type GuardOptions = {
    name?: string;
    message: string;
};

export type GuardFactory = new () => Guard;
