/** The decoration lines the text format menu can turn on, in their canonical order. */
const DECORATION_TOKENS = ["underline", "line-through"] as const;

/** One decoration line of `TextSlot.textDecoration`. */
export type TextDecorationToken = (typeof DECORATION_TOKENS)[number];

/**
 * Whether a `textDecoration` value carries one decoration line. Tokens the menu
 * does not write ("overline", …) read as absent, matching how the toggle drops
 * them when it rewrites the value.
 *
 * @param current - The slot's `textDecoration`; "none", an empty string and
 *   undefined all mean undecorated
 * @param token - The line to look for
 * @returns True when the line is on
 */
export const hasTextDecorationToken = (
	current: string | undefined,
	token: TextDecorationToken,
): boolean => (current ?? "").split(/\s+/).includes(token);

/**
 * The `textDecoration` value that turns one decoration line on when it is off
 * and off when it is on, leaving the other line as it was. The result is
 * normalized: the lines come in the canonical order (underline first), and a
 * value with no line left is "none" rather than an empty string.
 *
 * @param current - The slot's current `textDecoration`; "none", an empty string
 *   and undefined all mean undecorated, and tokens outside {@link DECORATION_TOKENS} are dropped
 * @param token - The line to flip
 * @returns The value to write, always a non-empty string
 */
export const toggleTextDecorationToken = (
	current: string | undefined,
	token: TextDecorationToken,
): string => {
	const nextTokens = DECORATION_TOKENS.filter((candidate) =>
		candidate === token
			? !hasTextDecorationToken(current, candidate)
			: hasTextDecorationToken(current, candidate),
	);
	return nextTokens.length === 0 ? "none" : nextTokens.join(" ");
};
