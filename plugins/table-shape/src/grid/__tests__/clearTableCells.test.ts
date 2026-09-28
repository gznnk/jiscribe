import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import type { TableCell } from "../../schema/TableDoc";
import type { TableState } from "../../state/TableState";
import { clearTableCells } from "../clearTableCells";

// The box is re-derived from the cells' text (see calcTableLayout.test.ts).
offerTextMeasurement(createEstimateTextMeasurement());

/** A 2x2 table; the top-left cell is styled and filled, so clearing can be seen to spare that. */
const makeTable = (overrides: Record<string, TableCell> = {}): TableState =>
	({
		id: "t-1",
		type: "table",
		cx: 500,
		cy: 400,
		width: 240,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		strokeWidth: 1,
		columns: [{ width: 120 }, { width: 120 }],
		rows: [{ height: 50 }, { height: 50 }],
		text: {
			r0c0: { text: "kept", fill: "#eee", fontWeight: "bold" },
			r0c1: { text: "gone" },
			r1c0: { text: "gone" },
			r1c1: { text: "" },
			...overrides,
		},
	}) as unknown as TableState;

describe("clearTableCells", () => {
	it("empties the named cells and leaves the rest as they were", () => {
		const cleared = clearTableCells(makeTable(), [
			"r0c1",
			"r1c0",
		]) as TableState;

		expect(cleared.text.r0c1.text).toBe("");
		expect(cleared.text.r1c0.text).toBe("");
		expect(cleared.text.r0c0.text).toBe("kept");
	});

	it("keeps the grid, cells and all", () => {
		const cleared = clearTableCells(makeTable(), ["r0c0"]) as TableState;

		expect(cleared.rows).toHaveLength(2);
		expect(cleared.columns).toHaveLength(2);
		expect(Object.keys(cleared.text)).toEqual(["r0c0", "r0c1", "r1c0", "r1c1"]);
	});

	it("spares the formatting, a cleared cell being emptied rather than rebuilt", () => {
		const cleared = clearTableCells(makeTable(), ["r0c0"]) as TableState;

		expect(cleared.text.r0c0).toEqual({
			text: "",
			fill: "#eee",
			fontWeight: "bold",
		});
	});

	it("refuses when every cell it names is empty already", () => {
		expect(clearTableCells(makeTable(), ["r1c1"])).toBeNull();
		expect(clearTableCells(makeTable(), [])).toBeNull();
		expect(clearTableCells(makeTable(), ["r9c9"])).toBeNull();
	});

	it("leaves the table it was given untouched", () => {
		const table = makeTable();
		clearTableCells(table, ["r0c0"]);

		expect(table.text.r0c0.text).toBe("kept");
	});
});
