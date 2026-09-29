/** Extracts only the keys that `src` owns and that are included in the allow-list `keys`. */
export const pick = (
	src: Record<string, unknown>,
	keys: readonly string[],
): Record<string, unknown> => {
	const out: Record<string, unknown> = {};
	for (const key of keys) {
		if (Object.prototype.hasOwnProperty.call(src, key)) {
			out[key] = src[key];
		}
	}
	return out;
};
