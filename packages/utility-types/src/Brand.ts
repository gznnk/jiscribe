/**
 * Tags a type with a unique symbol so that structurally identical types stop
 * being interchangeable.
 *
 * The brand key has type `never` and never exists at runtime, so a branded
 * value cannot be written as a literal — produce one with an assertion at the
 * boundary that validates it.
 *
 * @template T - `typeof` a `unique symbol` declared with `declare const`, so it
 *   stays type-level only. Brands built from different symbols remain mutually
 *   unassignable even when the structures they tag are identical.
 *
 * @example
 * ```typescript
 * declare const MetaDocBrand: unique symbol;
 * declare const MetaStateBrand: unique symbol;
 *
 * type MetaDoc = { name?: string } & Brand<typeof MetaDocBrand>;
 * type MetaState = { name?: string } & Brand<typeof MetaStateBrand>;
 *
 * const doc = { name: "test" } as MetaDoc;
 * const state: MetaState = doc; // Error: 'MetaDoc' is not assignable to 'MetaState'
 * ```
 */
export type Brand<T extends symbol> = {
	readonly [K in T]: never;
};
