export type Modify<T extends Record<string, any>, U> = Omit<T, keyof U> & U;

export type AnyConstructor = new (...args: any[]) => any;

export type ChildConstructor<Parent extends AnyConstructor> = new (...args: [...ConstructorParameters<Parent>, ...any[]]) => InstanceType<Parent>;