import { Collection } from "discord.js";
import path from "node:path";
import assert from "node:assert/strict";
import type { Dirent } from "fs";
import { color, isConstructor } from "../utils";
import type { HyperionClient } from "../structs";

export abstract class Registry<K extends string, V> extends Collection<K, V> {
    public readonly path: string;
    public readonly truncatedPath: string;

    protected constructor(public readonly client: HyperionClient, pathExt: string) {
        super();
        this.path = path.join(process.cwd(), `src`, pathExt);
        this.truncatedPath = this.path
            .match(/(?<=src).*/)?.[0]
            .replaceAll(/\\/g, "/")
            .replace(/^/, "/src") ?? this.path;
    }

    protected async import<As>(filePath: string, ...args: any[]) {
        const Class = (await import(filePath)).default as new (...args: any[]) => As;

        assert(
            isConstructor(Class),
            color(
                c => c.redBright`A class was not exported at:`,
                c => c.cyanBright(`${this.truncatedPath}/${filePath}`),
            ),
        );

        return new Class(...args);
    }

    /**
     * Similar to {@link Collection.get()} and {@link Collection.ensure()},
     * but throws an error if the supplied key doesn't exist. Use with caution.
     * @param key
     */
    public require(key: K) {
        const value = this.get(key);

        if (!value) {
            throw new Error(`Required key '${key}' not found in ${this.constructor.name}`);
        }

        return value;
    }

    /**
     * Similar to {@link Collection.map()}, but includes the key index as the second parameter.
     * @param fn
     */
    public mapWithIndex<U>(fn: (value: V, index: number, key: K) => U) {
        return Array.from(this.values()).map((val, i) => fn(val, i, this.keyAt(i)!));
    }

    /**
     * Returns the value at the specified index. Similar to {@link Array.findIndex()}.
     * @param predicate
     */
    public findIndex(predicate: (value: V, index: number) => boolean) {
        return Array.from(this.values()).findIndex(predicate);
    }

    protected isJsFile(file: Dirent) {
        return file.isFile() && (file.name.endsWith(".ts") || file.name.endsWith(".js"));
    }

    public abstract register(): Promise<void>;
}