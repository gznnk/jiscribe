import { createCanvasRegistries } from "@jiscribe/canvas";
import type { ObjectState } from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { tablePlugin } from "../plugin";
import type { TableState } from "../state/TableState";

// The box is re-derived from the cells' text (see calcTableLayout.test.ts).
offerTextMeasurement(createEstimateTextMeasurement());

/** A 2x2 table whose last row is taller than the first and filled. */
const TABLE = {
	id: "t-1",
	type: "table",
	cx: 500,
	cy: 400,
	width: 240,
	height: 110,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	strokeWidth: 1,
	columns: [{ width: 120 }, { width: 120 }],
	rows: [{ height: 50 }, { height: 60 }],
	text: {
		r0c0: { text: "a" },
		r0c1: { text: "b" },
		r1c0: { text: "c", fill: "#ff0000" },
		r1c1: { text: "d", fontWeight: "bold" },
	},
} as unknown as TableState;

const registries = createCanvasRegistries({ plugins: [tablePlugin] });

const textSlotKind = registries.objectPartKind.get(
	"table",
	TEXT_SLOT_PART_KIND,
);

const extendTable = (table: TableState): TableState => {
	const extended = textSlotKind?.extend?.(table as unknown as ObjectState);
	if (extended === undefined || extended === null) {
		throw new Error("the table's textSlot kind did not extend");
	}
	return extended as TableState;
};

describe("table textSlot extend", () => {
	it("appends a row after the last one, its cells listed after the old last cell", () => {
		const extended = extendTable(TABLE);

		expect(textSlotKind?.list?.(extended as unknown as ObjectState)).toEqual([
			"r0c0",
			"r0c1",
			"r1c0",
			"r1c1",
			"r2c0",
			"r2c1",
		]);
		expect(extended.text.r1c1).toEqual({ text: "d", fontWeight: "bold" });
	});

	it("styles the new row as Insert Row Below would: the last row's height and its cells' styling, no text", () => {
		const extended = extendTable(TABLE);

		expect(extended.rows).toEqual([
			{ height: 50 },
			{ height: 60 },
			{ height: 60 },
		]);
		expect(extended.text.r2c0).toEqual({ text: "", fill: "#ff0000" });
		expect(extended.text.r2c1).toEqual({ text: "", fontWeight: "bold" });
	});

	it("leaves the box to the content resizer, which grows it by the new row", () => {
		const extended = extendTable(TABLE);
		const resizer = registries.objectContentResizer.get("table");

		const resized = resizer?.(extended as unknown as ObjectState, {}) as
			TableState | undefined;

		expect(extended.height).toBe(TABLE.height);
		expect(resized?.height).toBeGreaterThanOrEqual(170);
	});
});
