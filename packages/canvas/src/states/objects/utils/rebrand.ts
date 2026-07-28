import type { Unbranded } from "@workspace/utility-types";

/**
 * Stamps the brand onto a structurally complete value, so building a branded
 * Doc / State does not cost the field-level type checking a bare assertion throws away.
 *
 * `Unbranded<T>` contextually types the argument, so every field is checked against
 * the target (missing, mistyped, and excess fields are all compile errors) and only the
 * symbol-keyed brand — which has no runtime existence — is taken on faith. `T` cannot be
 * inferred from the argument, so the target type must always be written explicitly.
 *
 * @param value - An object carrying every field of `T` except the brand key. Placeholder
 *   values a later pass overwrites are fine (`groupToState` 参照); a missing key is not, and
 *   is what this catches.
 * @returns The same object reference, typed as the branded `T`.
 */
export const rebrand = <T>(value: Unbranded<T>): T => value as T;
