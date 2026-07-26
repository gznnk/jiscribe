import { describe, expect, it } from "vitest";

import { snapLabelOffsetToLine } from "../snapLabelOffsetToLine";

describe("snapLabelOffsetToLine", () => {
	it("zeroes an offset inside the threshold, keeping position", () => {
		expect(snapLabelOffsetToLine({ position: 0.75, offset: 3 }, 8)).toEqual({
			position: 0.75,
			offset: 0,
		});
	});

	it("zeroes a negative offset inside the threshold", () => {
		expect(snapLabelOffsetToLine({ position: 0.2, offset: -3 }, 8)).toEqual({
			position: 0.2,
			offset: 0,
		});
	});

	it("returns the placement itself once the offset reaches the threshold", () => {
		const placement = { position: 0.5, offset: 8 };
		expect(snapLabelOffsetToLine(placement, 8)).toBe(placement);
	});
});
