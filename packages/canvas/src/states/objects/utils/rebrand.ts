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
 * @param value - The fully built object, brand key aside. Values that still need fields
 *   filled in by a later pass do not belong here; give the intermediate its own type instead.
 * @returns The same object reference, typed as the branded `T`.
 */
export const rebrand = <T>(value: Unbranded<T>): T => value as T;
