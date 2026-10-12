import { createCanvasRegistries } from "@jiscribe/canvas";
import type { ObjectPartSelection } from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import type { ICanvasRegistries, StyleContext } from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { tablePlugin } from "../../plugin";
import { tableCellSlotId } from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import type { TableState } from "../../state/TableState";

const RED = "#dc2626";
const BLUE = "#3b82f6";

/** A 2x3 grid of empty cells on a white background, `r0c0` alone painted red. */
const TABLE = (() => {
	const text: Record<string, TableCell> = {};
	for (let row = 0; row < 2; row++) {
		for (let column = 0; column < 3; column++) {
			text[tableCellSlotId(row, column)] = { text: "" };
		}
	}
	text.r0c0 = { text: "", fill: RED };
	return {
		id: "t-1",
		type: "table",
		columns: [{ width: 100 }, { width: 100 }, { width: 100 }],
		rows: [{}, {}],
		text,
		fill: "#ffffff",
	} as unknown as TableState;
})();

/**
 * The registries a canvas builds with the table registered: the style entries
 * are read through them, so what is tested is the table's declared kind having
 * replaced the derived one.
 */
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

const tableStyle = registries.objectStyle.get("table");
const fillEntry = tableStyle?.fill;
if (fillEntry === undefined) {
	throw new Error("the table registers no fill entry");
}

/** A pick of one range of `kind`, from `anchorId` to `focusId`. */
const pickOf = (
	kind: string,
	anchorId: string,
	focusId: string = anchorId,
): ObjectPartSelection => ({ kind, ranges: [{ anchorId, focusId }] });

const applyFill = (
	pick: ObjectPartSelection | null,
	color: string,
	table: TableState = TABLE,
): TableState => fillEntry.apply(table, pick, color, ctx) as TableState;

describe("the table's fill entry", () => {
	it("writes the table's own background with nothing picked, and no cell", () => {
		const written = applyFill(null, BLUE);

		expect(written.fill).toBe(BLUE);
		expect(written.text).toBe(TABLE.text);
	});

	it("reads the table's own background with nothing picked", () => {
		expect(fillEntry.read(TABLE, null, ctx)).toEqual(["#ffffff"]);
	});

	it("writes the cells a range covers and no others, leaving the background", () => {
		const written = applyFill(
			pickOf(TEXT_SLOT_PART_KIND, "r0c1", "r1c2"),
			BLUE,
		);

		for (const cellId of ["r0c1", "r0c2", "r1c1", "r1c2"]) {
			expect(written.text[cellId].fill).toBe(BLUE);
		}
		expect(written.text.r0c0.fill).toBe(RED);
		expect(written.text.r1c0.fill).toBeUndefined();
		expect(written.fill).toBe("#ffffff");
	});

	it("writes a picked row's cells and no others", () => {
		const written = applyFill(pickOf("row", "1"), BLUE);

		expect(
			["r1c0", "r1c1", "r1c2"].map((cellId) => written.text[cellId].fill),
		).toEqual([BLUE, BLUE, BLUE]);
		expect(written.text.r0c1.fill).toBeUndefined();
	});

	it("reads each picked cell on its own, an unpainted one as transparent", () => {
		// One value per cell rather than one per table is what lets the reader
		// fold a row that disagrees into mixed.
		expect(fillEntry.read(TABLE, pickOf("row", "0"), ctx)).toEqual([
			RED,
			"transparent",
			"transparent",
		]);
	});

	it("stores transparent rather than taking the field away", () => {
		const written = applyFill(
			pickOf(TEXT_SLOT_PART_KIND, "r0c0"),
			"transparent",
		);

		expect(written.text.r0c0).toEqual({ text: "", fill: "transparent" });
	});

	it("hands the same table back when every picked cell already holds the color", () => {
		const painted = applyFill(pickOf("column", "1"), BLUE);

		expect(applyFill(pickOf("column", "1"), BLUE, painted)).toBe(painted);
		expect(applyFill(pickOf(TEXT_SLOT_PART_KIND, "r0c0"), RED)).toBe(TABLE);
	});
});

// What keeps the fill controls in the menu and the sidebar under a cell pick,
// and the opacity row out of them: the background's alone, derived.
describe("the table's declared fill kinds", () => {
	it("declares fill and leaves fill opacity derived", () => {
		const declaredKinds = registries.objectStyle.declaredKinds("table");

		expect(declaredKinds.has("fill")).toBe(true);
		expect(declaredKinds.has("fillOpacity")).toBe(false);
		expect(tableStyle?.fillOpacity).toBeDefined();
	});
});
