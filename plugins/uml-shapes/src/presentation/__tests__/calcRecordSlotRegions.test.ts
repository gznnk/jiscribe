import { describe, it, expect } from "vitest";

import { RECORD_HEADER_HEIGHT } from "../../schema/RecordDoc";
import { calcRecordSlotRegions } from "../calcRecordSlotRegions";
import { calcRecordTextRegion } from "../calcRecordTextRegion";

describe("calcRecordSlotRegions", () => {
	it("puts the title band across the top and the rows under it", () => {
		const { name, rows } = calcRecordSlotRegions({ width: 180, height: 100 });
		expect(name).toEqual({
			x: -90,
			y: -50,
			width: 180,
			height: RECORD_HEADER_HEIGHT,
		});
		expect(rows).toEqual({
			x: -90,
			y: -50 + RECORD_HEADER_HEIGHT,
			width: 180,
			height: 100 - RECORD_HEADER_HEIGHT,
		});
	});

	it("leaves no gap and no overlap between the two compartments", () => {
		const { name, rows } = calcRecordSlotRegions({ width: 120, height: 90 });
		expect(name.y + name.height).toBe(rows.y);
		expect(name.height + rows.height).toBe(90);
	});

	it("shrinks the band rather than giving the rows a negative height", () => {
		const { name, rows } = calcRecordSlotRegions({ width: 120, height: 10 });
		expect(name.height).toBe(10);
		expect(rows.height).toBe(0);
	});
});

describe("calcRecordTextRegion", () => {
	it("returns the compartment matching the slot id", () => {
		const state = { width: 180, height: 100 };
		const regions = calcRecordSlotRegions(state);
		expect(calcRecordTextRegion(state, "name")).toEqual(regions.name);
		expect(calcRecordTextRegion(state, "rows")).toEqual(regions.rows);
	});

	it("falls back to the title band for an unknown slot id", () => {
		const state = { width: 180, height: 100 };
		expect(calcRecordTextRegion(state, "nope")).toEqual(
			calcRecordSlotRegions(state).name,
		);
	});
});
