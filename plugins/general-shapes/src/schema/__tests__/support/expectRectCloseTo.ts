import type { Rect } from "@jiscribe/geometry";
import { expect } from "vitest";

/**
 * Compares a text region / outline rect field by field with a tolerance.
 * Shape insets are ratios, so exact float equality is not meaningful.
 */
export const expectRectCloseTo = (actual: Rect, expected: Rect): void => {
	expect(actual.x).toBeCloseTo(expected.x);
	expect(actual.y).toBeCloseTo(expected.y);
	expect(actual.width).toBeCloseTo(expected.width);
	expect(actual.height).toBeCloseTo(expected.height);
};
