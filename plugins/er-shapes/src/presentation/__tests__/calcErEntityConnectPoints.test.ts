import { describe, expect, it } from "vitest";

import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToState } from "../../state/ErEntityMapper";
import { calcErEntityConnectPoints } from "../calcErEntityConnectPoints";
import { calcErEntityTextSlotRegions } from "../calcErEntityTextSlotRegions";
import { erEntityGeometryKey } from "../erEntityGeometryKey";

const makeState = (columns: ErEntityDoc["columns"]) =>
	erEntityToState({
		id: "e-1",
		type: "erEntity",
		x: 0,
		y: 0,
		// With the 29 px key gutter "PK" sets, 220 wide.
		nameWidth: 91,
		typeWidth: 100,
		name: "users",
		columns,
	} as ErEntityDoc);

describe("calcErEntityConnectPoints", () => {
	it("offers a left and a right point per column, in declared order", () => {
		const points = calcErEntityConnectPoints(
			makeState([{ name: "email" }, { key: "PK", name: "id" }]),
		);
		expect(points.map((point) => point.id)).toEqual([
			"col:0:left",
			"col:0:right",
			"col:1:left",
			"col:1:right",
		]);
	});

	it("sits on the box edges at the row's center, leaving outward", () => {
		const state = makeState([{ name: "email" }, { key: "PK", name: "id" }]);
		const regions = calcErEntityTextSlotRegions(state);
		const points = calcErEntityConnectPoints(state);
		const right = points.find((point) => point.id === "col:1:right");
		const left = points.find((point) => point.id === "col:0:left");
		const nameRegion = regions["col:1:name"];

		expect(right?.point).toEqual({
			x: 110,
			y: nameRegion.y + nameRegion.height / 2,
		});
		expect(right?.direction).toEqual({ x: 1, y: 0 });
		expect(left?.point.x).toBe(-110);
		expect(left?.direction).toEqual({ x: -1, y: 0 });
		// The PK column is drawn where it is declared, under the first one.
		expect(right?.point.y).toBeGreaterThan(left?.point.y ?? 0);
	});

	it("offers none for an entity with no columns", () => {
		expect(calcErEntityConnectPoints(makeState([]))).toEqual([]);
	});
});

describe("erEntityGeometryKey", () => {
	it("names every row's pitch, top to bottom", () => {
		expect(
			erEntityGeometryKey(
				makeState([{ key: "PK", name: "id" }, { name: "a" }, { name: "b" }]),
			),
		).toBe("25,25,25");
		expect(erEntityGeometryKey(makeState([]))).toBe("");
	});

	it("changes when a larger type moves to another row, the box and the count kept", () => {
		const first = makeState([
			{ name: { text: "a", fontSize: 20 } },
			{ name: "b" },
		]);
		const second = makeState([
			{ name: "a" },
			{ name: { text: "b", fontSize: 20 } },
		]);
		expect(second.height).toBe(first.height);
		expect(second.width).toBe(first.width);
		expect(erEntityGeometryKey(second)).not.toBe(erEntityGeometryKey(first));
	});

	it("changes when a column is added", () => {
		expect(erEntityGeometryKey(makeState([{ name: "a" }]))).not.toBe(
			erEntityGeometryKey(makeState([{ name: "a" }, { name: "b" }])),
		);
	});
});
