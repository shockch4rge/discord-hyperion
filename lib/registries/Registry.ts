import chalk from "chalk";
import { Collection } from "discord.js";
import assert from "node:assert/strict";
import { Dirent } from "node:fs";
import path from "node:path";

import { HyperionClient } from "../HyperionClient";
import { isConstructor } from "../util/types";

export abstract class Registry<T> extends Collection<string, T> {
    public readonly importPath: string;

    public constructor(public readonly client: HyperionClient) {
        super();
        this.importPath = path.join(process.cwd(), "./bot/src");
    }

    protected async import<T>(path: string) {
        // commonjs 'dynamic imports' return an object
        const [Class] = Object.values((await import(path)) as Record<string, new () => T>);

        const shortPath = path
            .match(/(?<=src).*/)?.[0]
            .replaceAll(/\\/g, "/")
            .replace(/^/, "....") ?? path;

        assert(
            isConstructor(Class),
            chalk.redBright`An event class was not exported at ${chalk.cyanBright(shortPath)}`
        );

        return new Class();
    }

    protected isValidFile(file: Dirent) {
        return file.isFile() && file.name.endsWith(".ts") || file.name.endsWith(".js");
    }

    public abstract register(): Promise<void>;
}
