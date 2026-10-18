import { describe, expect, it } from "vitest";

import {
	countErEntityColumns,
	erEntityColumnTextSlotId,
	erEntityTextSlotIds,
	parseErEntityColumnTextSlotId,
} from "../erEntityColumnIds";

describe("column slot ids", () => {
	it("spells and reads back col:<index>:<field>", () => {
		expect(erEntityColumnTextSlotId(2, "type")).toBe("col:2:type");
		expect(parseErEntityColumnTextSlotId("col:2:type")).toEqual({
			columnIndex: 2,
			field: "type",
		});
	});

	it("refuses the title and anything off the grammar", () => {
		expect(parseErEntityColumnTextSlotId("name")).toBeNull();
		expect(parseErEntityColumnTextSlotId("col:x:key")).toBeNull();
		expect(parseErEntityColumnTextSlotId("col:1:left")).toBeNull();
	});

	it("orders the slots title first, then key / name / type per column", () => {
		expect(erEntityTextSlotIds(2)).toEqual([
			"name",
			"col:0:key",
			"col:0:name",
			"col:0:type",
			"col:1:key",
			"col:1:name",
			"col:1:type",
		]);
	});

	it("counts columns off the run of name slots", () => {
		expect(countErEntityColumns({ name: {} })).toBe(0);
		expect(
			countErEntityColumns({
				"col:0:name": {},
				"col:1:name": {},
				"col:3:name": {},
			}),
		).toBe(2);
	});
});
