/** Trailing word an icon name never carries, but a caller borrowing one from a component often does. */
const REDUNDANT_SUFFIX = "-icon";

/**
 * Rewrites an icon name into the kebab-case spelling the icon set uses, so the
 * notations a caller is likely to reach for (`fileText`, `FileText`, `file_text`,
 * `File Text`, `file-text-icon`) all land on `file-text`.
 *
 * Digits are left where they are: `grid-2x2` puts a digit next to a letter on
 * purpose, so inserting a separator there would break a valid name. A name that
 * merely lost its separator (`trash2`) is caught by the edit-distance pass in
 * {@link import("./suggestIconNames").suggestIconNames} instead.
 *
 * @param name - Any spelling of a name, including one already normalized
 * @returns The kebab-case form; an empty string when nothing survives the rewrite
 */
export const normalizeIconName = (name: string): string => {
	const kebab = name
		.trim()
		// A capital starts a new word: "AArrowDown" -> "-a-arrow-down".
		.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
		.replace(/[\s_]+/g, "-")
		.replace(/-{2,}/g, "-")
		.replace(/^-+|-+$/g, "");

	return kebab.endsWith(REDUNDANT_SUFFIX)
		? kebab.slice(0, -REDUNDANT_SUFFIX.length)
		: kebab;
};
