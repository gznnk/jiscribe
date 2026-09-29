/**
 * The fields of `source` that actually carry a value, copied into a fresh
 * object. The shared half of every "take the styling that is there" step: a
 * merge target must not gain `undefined`-valued keys, since those shadow what it
 * would otherwise fall back to.
 *
 * @param source - The object to read; a key it does not own reads as unset, like one set to `undefined`
 * @param keys - The fields to consider, in the order the result carries them; anything else in `source` stays behind
 * @returns A new object holding only the fields `source` sets, `{}` when it sets none of them
 */
export const pickDefined = <TSource extends object, TKey extends keyof TSource>(
	source: TSource,
	keys: readonly TKey[],
): Partial<Pick<TSource, TKey>> => {
	const picked: Partial<Pick<TSource, TKey>> = {};
	for (const key of keys) {
		const value = source[key];
		if (value !== undefined) {
			picked[key] = value;
		}
	}
	return picked;
};
