import type { ResolvedViewPadding, ViewPaddingDoc } from "./ViewDoc";

/**
 * Fills in the sides a {@link ViewPaddingDoc} left out, each with 0.
 *
 * @param padding - The declared padding, or undefined for "no padding at all";
 *   both produce a fully-zero result
 * @returns A fresh object with all four sides present, so callers can destructure
 *   without repeating the defaults
 */
export const resolveViewPadding = (
	padding?: ViewPaddingDoc,
): ResolvedViewPadding => ({
	top: padding?.top ?? 0,
	right: padding?.right ?? 0,
	bottom: padding?.bottom ?? 0,
	left: padding?.left ?? 0,
});
