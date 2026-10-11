import { createCanvasRegistries } from "@jiscribe/canvas";
import type { ObjectPartSelection } from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import type { ICanvasRegistries, StyleContext } from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { tablePlugin } from "../../plugin";
import { tableCellSlotId } from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import type { TableState } from "../../state/TableState";
import { tableSlotsOf } from "../tableSlotsOf";

/** A 2x3 grid of empty cells; only `text` and the axes are read. */
const TABLE = (() => {
	const text: Record<string, TableCell> = {};
	for (let row = 0; row < 2; row++) {
		for (let column = 0; column < 3; column++) {
			text[tableCellSlotId(row, column)] = { text: "" };
		}
	}
	return {
		id: "t-1",
		type: "table",
		columns: [{ width: 100 }, { width: 100 }, { width: 100 }],
		rows: [{}, {}],
		text,
	} as unknown as TableState;
})();

/** The registries a canvas builds with the table registered, which is what declares its part kinds. */
const registries = createCanvasRegistries({
	plugins: [tablePlugin],
}) as unknown as ICanvasRegistries;

/** Only the part-kind registry is consulted. */
const ctx = {
	objectPartKind: registries.objectPartKind,
} as unknown as StyleContext;

/** A pick of one range of `kind`, from `anchorId` to `focusId`. */
const pickOf = (
	kind: string,
	anchorId: string,
	focusId: string = anchorId,
): ObjectPartSelection => ({ kind, ranges: [{ anchorId, focusId }] });

describe("tableSlotsOf", () => {
	it("reaches every cell with nothing picked", () => {
		expect(tableSlotsOf(TABLE, null, ctx)).toEqual(Object.keys(TABLE.text));
	});

	it("reaches the cells of a picked row alone", () => {
		expect(tableSlotsOf(TABLE, pickOf("row", "1"), ctx)).toEqual([
			"r1c0",
			"r1c1",
			"r1c2",
		]);
	});

	it("reaches the cells of every column a range covers, column by column", () => {
		expect(tableSlotsOf(TABLE, pickOf("column", "2", "1"), ctx)).toEqual([
			"r0c1",
			"r1c1",
			"r0c2",
			"r1c2",
		]);
	});

	it("reaches the picked cells, a range being the rectangle its ends corner", () => {
		expect(
			tableSlotsOf(TABLE, pickOf(TEXT_SLOT_PART_KIND, "r0c0", "r1c1"), ctx),
		).toEqual(["r0c0", "r0c1", "r1c0", "r1c1"]);
	});

	it("writes a row pick's bold into that row's cells and no others", () => {
		const table = registries.objectStyle.get("table");
		const written = table?.fontWeight?.apply(
			TABLE,
			pickOf("row", "0"),
			"bold",
			{ ...ctx, selected: true, textEditRange: null } as StyleContext,
		) as TableState;

		expect(written.text.r0c0.fontWeight).toBe("bold");
		expect(written.text.r0c2.fontWeight).toBe("bold");
		expect(written.text.r1c0.fontWeight).toBeUndefined();
	});
});
