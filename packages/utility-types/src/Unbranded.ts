/**
 * Drops the symbol-keyed brand from a branded type, leaving the structure a
 * value can actually be written as.
 *
 * A branded type cannot be produced by an object literal, so code that builds
 * one has to assert, discarding all field-level checking. Use this in the
 * parameter position of a stamping helper instead: the literal is then
 * contextually typed, so a missing or mistyped field is a compile error and
 * only the brand is taken on faith.
 *
 * Note that `satisfies Unbranded<T> as T` does not work as a substitute —
 * `Brand` declares its key as required, so the unbranded literal and `T` are
 * not comparable and the assertion still needs an `unknown` hop.
 *
 * Every symbol key is removed, not just `Brand`'s — none of the branded types
 * here carry a meaningful one.
 *
 * @template T - The branded object type. Property modifiers (`?` / `readonly`)
 *   are preserved; property value types are left branded (a nested `MetaState`
 *   stays a `MetaState`).
 *
 * @example
 * ```typescript
 * const rebrand = <T>(value: Unbranded<T>): T => value as T;
 * return rebrand<GroupState>({ ...base, type: "group", childIds: [] });
 * ```
 */
export type Unbranded<T> = {
	[K in keyof T as K extends symbol ? never : K]: T[K];
};
