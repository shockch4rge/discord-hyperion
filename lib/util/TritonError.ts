export const TritonErrors = {
    COMMAND_NOT_FOUND: (command: string) => `Command '${command}' not found.`,
    FOLDER_NOT_FOUND: (folderPath: string) => `Folder '${folderPath}' not found.`,
};

export type ErrorKey = keyof typeof TritonErrors;
export type ErrorArgs<K extends ErrorKey> = Parameters<typeof TritonErrors[K]>;

export class TritonError<K extends ErrorKey> extends Error {
    public constructor(key: K, ...args: ErrorArgs<K>) {
        super();
        // @ts-ignore
        this.message = TritonErrors[key](args);
        this.name = key;
    }
}
