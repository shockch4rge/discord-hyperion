export type Constructor<T = new () => any> = new (
    ...args: ConstructorParameters<T extends new () => T ? T : new () => any>
) => T;

export type AnyConstructor<T = new () => any> = new (...args: any[]) => T;

// https://stackoverflow.com/a/55032655/16144470
export type Modify<T, R> = Omit<T, keyof R> & R;

export const isConstructor = <T>(value: unknown): value is Constructor<T> => {
    return typeof value === "function";
};
