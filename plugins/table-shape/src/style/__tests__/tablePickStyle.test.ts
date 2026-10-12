import { createCanvasRegistries } from "@jiscribe/canvas";
import type { ObjectPartSelection } from "@jiscribe/canvas";
import {
	resolveSlotIds,
	TEXT_SLOT_PART_KIND,
	TEXT_STYLE_INTENT_KINDS,
} from "@jiscribe/canvas-sdk";
import type { ICanvasRegistries, StyleContext } from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { tablePlugin } from "../../plugin";
import { tableCellSlotId } from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import type { TableState } from "../../state/TableState";

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

const ctx: StyleContext = {
	selected: true,
	shapeStyleDefaults: registries.objectShapeStyleDefaults,
	textStyleDefaults: registries.objectTextStyleDefaults,
	objectPartKind: registries.objectPartKind,
	textEditRange: null,
};

/** A pick of one range of `kind`, from `anchorId` to `focusId`. */
const pickOf = (
	kind: string,
	anchorId: string,
	focusId: string = anchorId,
): ObjectPartSelection => ({ kind, ranges: [{ anchorId, focusId }] });

describe("the cells a pick of the table reaches (resolveSlotIds)", () => {
	it("reaches every cell with nothing picked", () => {
		expect(resolveSlotIds(TABLE, null, ctx)).toEqual(Object.keys(TABLE.text));
	});

	it("reaches the cells of a picked row alone", () => {
		expect(resolveSlotIds(TABLE, pickOf("row", "1"), ctx)).toEqual([
			"r1c0",
			"r1c1",
			"r1c2",
		]);
	});

	it("reaches the cells of every column a range covers, column by column", () => {
		expect(resolveSlotIds(TABLE, pickOf("column", "2", "1"), ctx)).toEqual([
			"r0c1",
			"r1c1",
			"r0c2",
			"r1c2",
		]);
	});

	it("reaches the picked cells, a range being the rectangle its ends corner", () => {
		expect(
			resolveSlotIds(TABLE, pickOf(TEXT_SLOT_PART_KIND, "r0c0", "r1c1"), ctx),
		).toEqual(["r0c0", "r0c1", "r1c0", "r1c1"]);
	});

	it("writes a row pick's bold into that row's cells and no others, through the core entry", () => {
		const written = registries.objectStyle
			.get("table")
			?.fontWeight?.apply(TABLE, pickOf("row", "0"), "bold", ctx) as TableState;

		expect(written.text.r0c0.fontWeight).toBe("bold");
		expect(written.text.r0c2.fontWeight).toBe("bold");
		expect(written.text.r1c0.fontWeight).toBeUndefined();
	});
});

describe("what a pick of the table receives", () => {
	it("gives a cell, a row and a column pick the text kinds and the fill, and not its opacity", () => {
		for (const kind of [TEXT_SLOT_PART_KIND, "row", "column"]) {
			const styleIntentKinds = registries.objectPartKind.get(
				"table",
				kind,
			)?.styleIntentKinds;

			expect([...(styleIntentKinds ?? [])].sort()).toEqual(
				[...TEXT_STYLE_INTENT_KINDS, "fill"].sort(),
			);
			expect(styleIntentKinds?.has("fillOpacity")).toBe(false);
		}
	});
});
