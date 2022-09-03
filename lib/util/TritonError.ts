import chalk from "chalk";

export const TritonErrors = {
    PathNotFound: (path: string) => `Path not found: ${path}` as const,
    CommandNotFound: (command: string) => `Command '${command}' not found.` as const,
};

export type ErrorKey = keyof typeof TritonErrors;
export type ErrorArgs<K extends ErrorKey> = Parameters<typeof TritonErrors[K]>;

export class TritonError<K extends ErrorKey> extends Error {
    public constructor(
        error: (errors: typeof TritonErrors) => typeof TritonErrors[K],
        ...args: ErrorArgs<K>
    ) {
        // @ts-ignore
        super(chalk.red`${error(TritonErrors)(...args)}`);
    }
}
