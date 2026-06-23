import { describe, expect, it } from "vitest";

import { isValidPolygonState } from "../validatePolygonState";

const pts = (n: number) =>
	Array.from({ length: n }, (_v, i) => ({ x: i, y: i }));

const validPolygon = {
	id: "pg1",
	type: "polygon",
	points: pts(3),
	stroke: "#000",
	fill: "#eee",
};

describe("isValidPolygonState", () => {
	it("有効な Polygon（3 点以上）は true", () => {
		expect(isValidPolygonState(validPolygon)).toBe(true);
	});

	it("points が 2 点のみは false（閉多角形は最低 3 点）", () => {
		expect(isValidPolygonState({ ...validPolygon, points: pts(2) })).toBe(
			false,
		);
	});

	it("points 欠落は false", () => {
		expect(isValidPolygonState({ ...validPolygon, points: undefined })).toBe(
			false,
		);
	});

	it("CSS インジェクションを含む fill は false", () => {
		expect(
			isValidPolygonState({ ...validPolygon, fill: "url(http://evil)" }),
		).toBe(false);
	});
});
