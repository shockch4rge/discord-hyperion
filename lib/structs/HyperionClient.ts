import type { ClientOptions } from "discord.js";
import { ChannelType, Client } from "discord.js";
import type { AnyConstructor } from "../utils";
import { HyperionError } from "../utils";
import type { ButtonRegistry, CommandRegistry, ModalRegistry, SelectMenuRegistry } from "../registries";
import { BaseLogger } from "./BaseLogger";

export class HyperionClient<DB = any> extends Client {
    declare public readonly commands: CommandRegistry;
    declare public readonly buttons: ButtonRegistry;
    declare public readonly selectMenus: SelectMenuRegistry;
    declare public readonly modals: ModalRegistry;

    public readonly name: string;
    public readonly description: string;
    public readonly contexts: HyperionClientContexts<DB>;
    public readonly ownerIds: string[];
    public readonly logger: BaseLogger;
    private readonly database?: DB;

    public constructor(options: HyperionClientOptions<DB>) {
        super(options.discord);

        this.name = options.name;
        this.description = options.description;
        this.contexts = options.contexts;
        this.ownerIds = options.ownerIds.length ? options.ownerIds : [this.application!.owner!.id];
        this.database = options.database;

        this.logger = options.logger ?? new BaseLogger();
    }

    public get db() {
        if (!this.database) {
            throw new HyperionError(e => e.AccessedUndefinedDatabase());
        }

        return this.database;
    }
}

export type HyperionClientOptions<DB> = {
    name: string;
    description: string;
    contexts: HyperionClientContexts<DB>;
    discord: ClientOptions;
    ownerIds: string[];
    database?: DB;
    logger?: BaseLogger;
};

export interface HyperionClientContexts<DB> {
    SlashCommandContext: AnyConstructor;
    ButtonContext: AnyConstructor;
    SelectMenuContext: AnyConstructor;
    ModalContext: AnyConstructor;
    AutocompleteContext: AnyConstructor;
}

