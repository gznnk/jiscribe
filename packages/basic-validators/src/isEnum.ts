/**
 * Builds a type guard for membership in a fixed set of values.
 *
 * @param allowedValues - Values that pass, compared by `Array.includes` (SameValueZero), so
 *   objects match by reference and `NaN` matches `NaN`; declare it `as const` to keep `T`
 *   narrowed to the literal union
 * @returns Type guard narrowing to the element type `T`
 */
export const isEnum =
	<T>(allowedValues: readonly T[]) =>
	(value: unknown): value is T => {
		return allowedValues.includes(value as T);
	};
