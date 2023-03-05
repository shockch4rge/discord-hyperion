import type { BaseButtonContext, BaseSelectMenuContext, BaseSlashCommandContext } from "./contexts";

export abstract class Guard {
    public readonly name: string;
    public readonly description: string;

    protected constructor(options: GuardOptions) {
        this.name = options.name ?? this.constructor.name;
        this.description = options.description;
    }

    public slashRun?(context: BaseSlashCommandContext): Promise<boolean>;
    public slashFail?(context: BaseSlashCommandContext): Promise<void>;

    public buttonRun?(context: BaseButtonContext): Promise<boolean>;
    public buttonFail?(context: BaseButtonContext): Promise<void>;

    public selectMenuRun?(context: BaseSelectMenuContext): Promise<boolean>;
    public selectMenuFail?(context: BaseSelectMenuContext): Promise<void>;
}

export type GuardOptions = {
    name?: string;
    description: string;
};
