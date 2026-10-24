import { describe, it, expect } from "vitest";

import { unionBoundingBoxes } from "../../geometry/unionBoundingBoxes";

describe("unionBoundingBoxes", () => {
	it("returns null for no boxes", () => {
		expect(unionBoundingBoxes([])).toBeNull();
	});

	it("returns null when every entry is null or undefined", () => {
		expect(unionBoundingBoxes([null, undefined, null])).toBeNull();
	});

	it("returns a copy of a single box", () => {
		const box = { left: 1, top: 2, right: 3, bottom: 4 };
		const result = unionBoundingBoxes([box]);
		expect(result).toEqual(box);
		expect(result).not.toBe(box);
	});

	it("encloses several boxes", () => {
		const result = unionBoundingBoxes([
			{ left: 0, top: 5, right: 10, bottom: 8 },
			{ left: -3, top: 6, right: 4, bottom: 20 },
			{ left: 2, top: -1, right: 12, bottom: 3 },
		]);
		expect(result).toEqual({ left: -3, top: -1, right: 12, bottom: 20 });
	});

	it("skips null and undefined entries among boxes", () => {
		const result = unionBoundingBoxes([
			null,
			{ left: 0, top: 0, right: 1, bottom: 1 },
			undefined,
			{ left: 4, top: 4, right: 5, bottom: 5 },
			null,
		]);
		expect(result).toEqual({ left: 0, top: 0, right: 5, bottom: 5 });
	});

	it("accepts any iterable", () => {
		const boxes = new Set([
			{ left: 0, top: 0, right: 1, bottom: 1 },
			{ left: -1, top: 2, right: 0, bottom: 3 },
		]);
		expect(unionBoundingBoxes(boxes)).toEqual({
			left: -1,
			top: 0,
			right: 1,
			bottom: 3,
		});
	});

	it("propagates a NaN edge", () => {
		const result = unionBoundingBoxes([
			{ left: 0, top: 0, right: 1, bottom: 1 },
			{ left: NaN, top: 0, right: 1, bottom: 1 },
		]);
		expect(result?.left).toBeNaN();
		expect(result?.top).toBe(0);
	});
});
