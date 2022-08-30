import { SlashCommandContext } from "./context";
import { MessageCommandContext } from "./context/MessageCommandContext";

export abstract class Guard {
    public readonly options: GuardOptions;

    public constructor({ name, message }: GuardOptions) {
        this.options = {
            name: name ?? this.constructor.name,
            message,
        };
    }

    public slashRun?(context: SlashCommandContext): Promise<boolean>;
    public messageRun?(context: MessageCommandContext): Promise<boolean>;
}

export type GuardOptions = {
    name?: string;
    message: string;
};

export type GuardFactory = new () => Guard;
