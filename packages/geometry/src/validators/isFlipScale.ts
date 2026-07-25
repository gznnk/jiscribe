import type { FlipScale } from "../types/FlipScale";

/** Type guard for {@link FlipScale}: the value must be exactly 1 or -1. */
export const isFlipScale = (value: unknown): value is FlipScale => {
	return value === 1 || value === -1;
};
