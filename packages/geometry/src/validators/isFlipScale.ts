import type { FlipScale } from "../types/FlipScale";

/**
 * Type guard for {@link FlipScale}: the value must be exactly 1 or -1.
 *
 * @param value - Value to narrow; compared by identity, so a general scale
 *   factor such as 2, and the strings `"1"` / `"-1"`, are all rejected
 */
export const isFlipScale = (value: unknown): value is FlipScale => {
	return value === 1 || value === -1;
};
