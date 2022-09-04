import { Collection } from "discord.js";
import path from "node:path";

export abstract class Registry<T> extends Collection<string, T> {
    public readonly importPath = path.join(process.cwd(), "./bot/src");

    public abstract register(): Promise<void>;
}
