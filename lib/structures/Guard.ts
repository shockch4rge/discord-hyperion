import { ButtonContext, MessageCommandContext, SlashCommandContext } from "./context";

export abstract class Guard {
    public readonly options: GuardOptions;

    public constructor({ name, message }: GuardOptions) {
        this.options = {
            name: name ?? this.constructor.name,
            message,
        };
    }

    public slashRun?(context: SlashCommandContext): Promise<boolean>;
    public onSlashFail?(context: SlashCommandContext): Promise<void>;
    public buttonRun?(context: ButtonContext): Promise<boolean>;
    public buttonFail?(context: ButtonContext): Promise<void>;
    public messageRun?(context: MessageCommandContext): Promise<boolean>;
}

export type GuardOptions = {
    name?: string;
    message: string;
};

export type GuardFactory = new () => Guard;
