import { describe, expect, it } from "vitest";

import { isValidPolygonState } from "../validatePolygonState";

// Colours are the "auto" sentinel: a real colour would reach isCssColor
// (CSS.supports), which the node test environment has no CSS for. Real colours
// are covered by the paste e2e.
const pts = (n: number) =>
	Array.from({ length: n }, (_v, i) => ({ x: i, y: i }));

const validPolygon = {
	id: "pg1",
	type: "polygon",
	points: pts(3),
	stroke: "auto",
	fill: "auto",
};

describe("isValidPolygonState", () => {
	it("valid Polygon (3 or more points) is true", () => {
		expect(isValidPolygonState(validPolygon)).toBe(true);
	});

	it("only 2 points is false (a closed polygon needs at least 3 points)", () => {
		expect(isValidPolygonState({ ...validPolygon, points: pts(2) })).toBe(
			false,
		);
	});

	it("missing points is false", () => {
		expect(isValidPolygonState({ ...validPolygon, points: undefined })).toBe(
			false,
		);
	});

	it("fill containing CSS injection is false", () => {
		expect(
			isValidPolygonState({ ...validPolygon, fill: "url(http://evil)" }),
		).toBe(false);
	});
});
