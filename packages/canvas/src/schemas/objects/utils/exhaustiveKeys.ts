/**
 * Returns a builder that accepts only an array covering every key of type T.
 *
 * `satisfies readonly (keyof T)[]` only guarantees "no non-existent keys are mixed in"
 * and still accepts an array that misses (is shorter than) the full key set. Building the
 * array with this helper produces a compile error when a field is added to T but the key
 * array is not kept in sync, preventing allow-list pass-through gaps in the Frame mappers.
 * The return value is used directly as a key constant, so it never becomes unused.
 *
 * @example
 * export const STROKE_STYLE_KEYS = exhaustiveKeysOf<StrokeStyleDoc>()([
 *   "stroke",
 *   "strokeWidth",
 *   "strokeDashType",
 * ] as const);
 */
export const exhaustiveKeysOf =
	<T>() =>
	<K extends readonly (keyof T)[]>(
		keys: K & ([keyof T] extends [K[number]] ? unknown : never),
	): K =>
		keys;
