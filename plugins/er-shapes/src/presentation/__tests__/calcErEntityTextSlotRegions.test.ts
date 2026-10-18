import { describe, expect, it } from "vitest";

import { calcErEntityLayout } from "../../layout/calcErEntityLayout";
import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToState } from "../../state/ErEntityMapper";
import {
	calcErEntityTextSlotRegion,
	calcErEntityTextSlotRegions,
} from "../calcErEntityTextSlotRegions";

// With an empty key gutter of 24 px, the box is 24 + 96 + 100 = 220 wide.
const makeState = (columns: ErEntityDoc["columns"]) =>
	erEntityToState({
		id: "e-1",
		type: "erEntity",
		x: 0,
		y: 0,
		nameWidth: 96,
		typeWidth: 100,
		name: "users",
		columns,
	} as ErEntityDoc);

describe("calcErEntityTextSlotRegions", () => {
	it("answers a region for every slot of the state", () => {
		const state = makeState([{ name: "id" }, { name: "email" }]);
		expect(Object.keys(calcErEntityTextSlotRegions(state)).sort()).toEqual(
			Object.keys(state.text).sort(),
		);
	});

	it("puts the title in the band at the top", () => {
		const regions = calcErEntityTextSlotRegions(makeState([{ name: "id" }]));
		expect(regions.name).toEqual({ x: -110, y: -26.5, width: 220, height: 28 });
	});

	it("keeps a 24 px key gutter even when every key is empty", () => {
		const regions = calcErEntityTextSlotRegions(
			makeState([{ name: "id" }, { name: "email" }]),
		);
		expect(regions["col:0:key"].x).toBe(-110);
		expect(regions["col:0:key"].width).toBe(24);
		expect(regions["col:0:name"].x).toBe(-110 + 24);
	});

	it("draws the name and the type at their own widths, the type at the right", () => {
		const regions = calcErEntityTextSlotRegions(
			makeState([{ name: "id", type: "int" }]),
		);
		expect(regions["col:0:name"].x).toBe(-110 + 24);
		expect(regions["col:0:name"].width).toBe(96);
		expect(regions["col:0:type"].x).toBe(-110 + 24 + 96);
		expect(regions["col:0:type"].width).toBe(100);
		expect(regions["col:0:type"].x + regions["col:0:type"].width).toBe(110);
	});

	it("draws a PK column where it is declared", () => {
		const regions = calcErEntityTextSlotRegions(
			makeState([{ name: "email" }, { key: "PK", name: "id" }]),
		);
		expect(regions["col:1:name"].y).toBe(
			regions["col:0:name"].y + regions["col:0:name"].height,
		);
	});

	it("gives every cell exactly its row band, the rows a pitch apart", () => {
		const state = makeState([{ name: "a" }, { name: "b" }]);
		const regions = calcErEntityTextSlotRegions(state);
		const layout = calcErEntityLayout(state);
		for (const row of layout.rows) {
			const keyRegion = regions[`col:${row.columnIndex}:key`];
			const typeRegion = regions[`col:${row.columnIndex}:type`];
			for (const field of ["key", "name", "type"]) {
				const region = regions[`col:${row.columnIndex}:${field}`];
				expect(region.y).toBe(row.band.y);
				expect(region.height).toBe(row.band.height);
			}
			expect(keyRegion.x).toBe(row.band.x);
			expect(typeRegion.x + typeRegion.width).toBe(row.band.x + row.band.width);
		}
		expect(regions["col:0:name"].height).toBe(25);
		expect(regions["col:1:name"].y - regions["col:0:name"].y).toBe(25);
		expect(regions["col:1:name"].y + regions["col:1:name"].height).toBe(
			state.height / 2,
		);
	});
});

describe("calcErEntityTextSlotRegion", () => {
	it("places each slot alone where the batch places it", () => {
		const state = makeState([
			{ key: "PK", name: "id", type: "bigint" },
			{ name: { text: "email", fontSize: 20 }, type: "text" },
		]);
		const regions = calcErEntityTextSlotRegions(state);
		for (const slotId of Object.keys(state.text)) {
			expect(calcErEntityTextSlotRegion(state, slotId)).toEqual(
				regions[slotId],
			);
		}
	});

	it("refuses a slot the entity does not place", () => {
		const state = makeState([{ name: "id" }]);
		expect(() => calcErEntityTextSlotRegion(state, "col:1:name")).toThrow(
			/col:1:name/,
		);
		expect(() => calcErEntityTextSlotRegion(state, "col:0")).toThrow();
	});
});
