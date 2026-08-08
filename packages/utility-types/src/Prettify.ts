/**
 * Flattens a type into a single object literal so editors show its properties
 * instead of the intersection it was built from.
 *
 * Display only: the result stays mutually assignable with `T`.
 *
 * @template T - An object type. Only its top-level keys are flattened; property
 *   types are left as they are.
 *
 * @example
 * ```typescript
 * type Joined = Prettify<{ a: number } & { b: string }>;
 * // hovers as { a: number; b: string } instead of { a: number } & { b: string }
 * ```
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
