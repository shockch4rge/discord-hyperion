import { Collection } from "discord.js";
import path from "node:path";

import { TritonClient } from "../TritonClient";

export abstract class Registry<T> extends Collection<string, T> {
    public readonly importPath: string;

    public constructor(public readonly client: TritonClient) {
        super();
        this.importPath = path.join(process.cwd(), "./bot/src");
    }

    protected async import<T>(path: string) {
        // commonjs 'dynamic imports' return an object
        const Class = Object.values((await import(path)) as Record<string, new () => T>)[0];
        return new Class();
    }

    public abstract register(): Promise<void>;
}
