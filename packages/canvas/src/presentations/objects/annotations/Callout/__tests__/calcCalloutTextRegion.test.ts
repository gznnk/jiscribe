import { describe, it, expect } from "vitest";

import {
	CALLOUT_TAIL_DEFAULT,
	CALLOUT_TAIL_RATIO,
} from "../../../../../schemas/objects/annotations/callout/CalloutDoc";
import { expectRectCloseTo } from "../../../__tests__/support/expectRectCloseTo";
import { calcCalloutTextRegion } from "../calcCalloutTextRegion";

const size = { width: 200, height: 100 };
const bandWidth = 200 * CALLOUT_TAIL_RATIO;
const bandHeight = 100 * CALLOUT_TAIL_RATIO;

describe("calcCalloutTextRegion", () => {
	it("insets from the bottom for the default tail when the field is absent", () => {
		expectRectCloseTo(calcCalloutTextRegion({ ...size, tail: undefined }), {
			x: -100,
			y: -50,
			width: 200,
			height: 100 - bandHeight,
		});
		expect(CALLOUT_TAIL_DEFAULT.side).toBe("bottom");
	});

	it("insets from the top for a top tail", () => {
		expectRectCloseTo(
			calcCalloutTextRegion({ ...size, tail: { side: "top", position: 0.5 } }),
			{ x: -100, y: -50 + bandHeight, width: 200, height: 100 - bandHeight },
		);
	});

	it("insets from the left for a left tail", () => {
		expectRectCloseTo(
			calcCalloutTextRegion({ ...size, tail: { side: "left", position: 0.5 } }),
			{ x: -100 + bandWidth, y: -50, width: 200 - bandWidth, height: 100 },
		);
	});

	it("insets from the right for a right tail", () => {
		expectRectCloseTo(
			calcCalloutTextRegion({
				...size,
				tail: { side: "right", position: 0.5 },
			}),
			{ x: -100, y: -50, width: 200 - bandWidth, height: 100 },
		);
	});

	it("insets only on the tail axis, leaving the other axis at full size", () => {
		const vertical = calcCalloutTextRegion({
			...size,
			tail: { side: "bottom", position: 0.5 },
		});
		const horizontal = calcCalloutTextRegion({
			...size,
			tail: { side: "left", position: 0.5 },
		});
		expect(vertical.width).toBeCloseTo(200);
		expect(horizontal.height).toBeCloseTo(100);
	});

	it("ignores the tip position: only the side moves the band", () => {
		const near = calcCalloutTextRegion({
			...size,
			tail: { side: "bottom", position: 0 },
		});
		const far = calcCalloutTextRegion({
			...size,
			tail: { side: "bottom", position: 1 },
		});
		expect(near).toEqual(far);
	});

	it("stays inside the bounding box", () => {
		for (const side of ["top", "right", "bottom", "left"] as const) {
			const region = calcCalloutTextRegion({
				...size,
				tail: { side, position: 0.5 },
			});
			expect(region.x).toBeGreaterThanOrEqual(-100);
			expect(region.x + region.width).toBeLessThanOrEqual(100);
			expect(region.y).toBeGreaterThanOrEqual(-50);
			expect(region.y + region.height).toBeLessThanOrEqual(50);
		}
	});
});
