export type ReadonlyOmit<T, K extends keyof T> = Readonly<Omit<T, K>>;
