/**
 * Check if value is one of the allowed values.
 * Returns a type guard function.
 */
export const isEnum =
	<T>(allowedValues: readonly T[]) =>
	(value: unknown): value is T => {
		return allowedValues.includes(value as T);
	};
