import type { FlipScale } from "../types/FlipScale";

/**
 * Check if a value is a FlipScale (反転フラグ: 1 または -1)。
 *
 * @param value - The value to check
 * @returns True if the value is 1 or -1, false otherwise
 */
export const isFlipScale = (value: unknown): value is FlipScale => {
	return value === 1 || value === -1;
};
