import { describe, expect, it } from "vitest";

import { isValidPolylineState } from "../validatePolylineState";

const pts = (n: number) =>
	Array.from({ length: n }, (_v, i) => ({ x: i, y: i }));

const validPolyline = {
	id: "p1",
	type: "polyline",
	points: pts(2),
	stroke: "#000",
	strokeWidth: 1,
	startArrow: "None",
};

describe("isValidPolylineState", () => {
	it("有効な Polyline（2 点以上）は true", () => {
		expect(isValidPolylineState(validPolyline)).toBe(true);
		expect(isValidPolylineState({ ...validPolyline, points: pts(5) })).toBe(
			true,
		);
	});

	it("points が 1 点のみ / 欠落は false（最低 2 点）", () => {
		expect(isValidPolylineState({ ...validPolyline, points: pts(1) })).toBe(
			false,
		);
		expect(isValidPolylineState({ ...validPolyline, points: undefined })).toBe(
			false,
		);
	});

	it("不正な ArrowType は false", () => {
		expect(
			isValidPolylineState({ ...validPolyline, endArrow: "diamond" }),
		).toBe(false);
	});

	it("CSS インジェクションを含む stroke は false", () => {
		expect(
			isValidPolylineState({ ...validPolyline, stroke: "red; } body {" }),
		).toBe(false);
	});
});
