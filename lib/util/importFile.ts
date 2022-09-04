import { Constructor } from "./types";

export const importFile = async <T>(path: string) => {
    // commonjs 'dynamic imports' return an object
    const Class = Object.values((await import(path)) as Record<string, Constructor<T>>)[0];
    return new Class();
};
