import { describe, it, expect } from "vitest";

import { formatPolygonPoints } from "../formatPolygonPoints";

describe("formatPolygonPoints", () => {
	it("writes each point as x,y and joins them with spaces", () => {
		expect(
			formatPolygonPoints([
				{ x: 0, y: 0 },
				{ x: 10, y: 20 },
				{ x: -5, y: 7 },
			]),
		).toBe("0,0 10,20 -5,7");
	});

	it("yields an empty string for no points, which SVG reads as an empty polygon", () => {
		expect(formatPolygonPoints([])).toBe("");
	});

	it("emits a single point without a trailing separator", () => {
		expect(formatPolygonPoints([{ x: 3, y: 4 }])).toBe("3,4");
	});

	it("keeps fractional coordinates, which the outline samplers produce", () => {
		expect(formatPolygonPoints([{ x: 1.5, y: -2.25 }])).toBe("1.5,-2.25");
	});

	it("does not close the ring, which SVG's polygon does on its own", () => {
		const square = [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 10, y: 10 },
			{ x: 0, y: 10 },
		];
		expect(formatPolygonPoints(square).split(" ")).toHaveLength(square.length);
	});
});
