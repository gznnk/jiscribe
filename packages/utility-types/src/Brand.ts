/**
 * Brands a type with a unique symbol to prevent structural type compatibility.
 * This creates a nominal type that cannot be directly assigned to other types
 * with the same structure but different brands.
 *
 * @template T - The unique symbol type used as the brand identifier
 *
 * @example
 * ```typescript
 * declare const MetaDocBrand: unique symbol;
 * declare const MetaStateBrand: unique symbol;
 *
 * type MetaDoc = {
 *   name?: string;
 *   description?: string;
 * } & Brand<typeof MetaDocBrand>;
 *
 * type MetaState = {
 *   name?: string;
 *   description?: string;
 * } & Brand<typeof MetaStateBrand>;
 *
 * const doc: MetaDoc = { name: "test" } as MetaDoc;
 * const state: MetaState = doc; // Error: Type 'MetaDoc' is not assignable to type 'MetaState'
 * ```
 */
export type Brand<T extends symbol> = {
	readonly [K in T]: never;
};
