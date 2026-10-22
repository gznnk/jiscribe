import type { TransformedFrame } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { calcTransformedRectBounds } from "../calcTransformedRectBounds";

const frameAt = (
	overrides: Partial<TransformedFrame> = {},
): TransformedFrame => ({
	cx: 100,
	cy: 50,
	width: 40,
	height: 20,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	...overrides,
});

const expectBounds = (
	actual: ReturnType<typeof calcTransformedRectBounds>,
	expected: ReturnType<typeof calcTransformedRectBounds>,
) => {
	expect(actual.left).toBeCloseTo(expected.left);
	expect(actual.top).toBeCloseTo(expected.top);
	expect(actual.right).toBeCloseTo(expected.right);
	expect(actual.bottom).toBeCloseTo(expected.bottom);
};

// A rect below the shape's center, off to the right: (5, 2)–(15, 8) locally.
const offsetRect = { x: 5, y: 2, width: 10, height: 6 };

describe("calcTransformedRectBounds", () => {
	it("translates the rect by the shape's center when untransformed", () => {
		expectBounds(calcTransformedRectBounds(offsetRect, frameAt()), {
			left: 105,
			top: 52,
			right: 115,
			bottom: 58,
		});
	});

	it("rotates the rect about the shape's center (degrees, clockwise on screen)", () => {
		expectBounds(
			calcTransformedRectBounds(offsetRect, frameAt({ rotation: 90 })),
			{ left: 92, top: 55, right: 98, bottom: 65 },
		);
	});

	it("bounds a rotated rect by the upright box around its corners", () => {
		const square = { x: -5, y: -5, width: 10, height: 10 };
		const half = 5 * Math.SQRT2;

		expectBounds(calcTransformedRectBounds(square, frameAt({ rotation: 45 })), {
			left: 100 - half,
			top: 50 - half,
			right: 100 + half,
			bottom: 50 + half,
		});
	});

	it("mirrors the rect across the center for a flipped shape", () => {
		expectBounds(
			calcTransformedRectBounds(offsetRect, frameAt({ scaleX: -1 })),
			{ left: 85, top: 52, right: 95, bottom: 58 },
		);
		expectBounds(
			calcTransformedRectBounds(offsetRect, frameAt({ scaleY: -1 })),
			{ left: 105, top: 42, right: 115, bottom: 48 },
		);
	});

	it("needs no normalization for a negative width / height", () => {
		const negative = { x: 15, y: 8, width: -10, height: -6 };

		expectBounds(calcTransformedRectBounds(negative, frameAt()), {
			left: 105,
			top: 52,
			right: 115,
			bottom: 58,
		});
	});
});
