export type Constructor<T = new () => any> = new (
    ...args: ConstructorParameters<T extends new () => T ? T : new () => any>
) => T;

export type AnyConstructor<T = new () => any> = new (...args: any[]) => T;
