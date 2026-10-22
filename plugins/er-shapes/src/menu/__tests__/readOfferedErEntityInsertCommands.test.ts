import type { CanvasSelection } from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { ER_ENTITY_COLUMN_PART_KIND } from "../../parts/erEntityColumnPartKind";
import { ER_ENTITY_LANE_PART_KIND } from "../../parts/erEntityLanePartKind";
import { readOfferedErEntityInsertCommands } from "../readOfferedErEntityInsertCommands";

/** The entity picked alone, with the slot ranges given as `[anchorId, focusId]` pairs under `kind`. */
const pickParts = (
	kind: string,
	ranges: ReadonlyArray<readonly [string, string]>,
): CanvasSelection => ({
	objectIds: ["users"],
	part: {
		kind,
		ranges: ranges.map(([anchorId, focusId]) => ({ anchorId, focusId })),
	},
});

/** The ids of the commands offered, in the order their buttons are drawn. */
const readOfferedIds = (selection: CanvasSelection): string[] =>
	readOfferedErEntityInsertCommands(selection).map((command) => command.id);

describe("readOfferedErEntityInsertCommands", () => {
	it("offers the bottom insertion alone for the entity selected as a whole", () => {
		expect(readOfferedIds({ objectIds: ["users"], part: null })).toEqual([
			"erEntity.appendColumn",
		]);
	});

	it("offers nothing with no object or several selected", () => {
		expect(readOfferedIds({ objectIds: [], part: null })).toEqual([]);
		expect(
			readOfferedIds({ objectIds: ["users", "orders"], part: null }),
		).toEqual([]);
	});

	it("offers above and below for a picked column", () => {
		expect(
			readOfferedIds(
				pickParts(ER_ENTITY_COLUMN_PART_KIND, [["col:1", "col:1"]]),
			),
		).toEqual(["erEntity.insertColumnAbove", "erEntity.insertColumnBelow"]);
	});

	it("offers above and below for a picked column slot", () => {
		expect(
			readOfferedIds(
				pickParts(TEXT_SLOT_PART_KIND, [["col:0:name", "col:0:name"]]),
			),
		).toEqual(["erEntity.insertColumnAbove", "erEntity.insertColumnBelow"]);
	});

	it("offers nothing for the title slot picked alone, which names no column", () => {
		expect(
			readOfferedIds(pickParts(TEXT_SLOT_PART_KIND, [["name", "name"]])),
		).toEqual([]);
	});

	it("offers above and below once a pick reaches past the title into a column", () => {
		// A range from the title into a column, and the title beside a column slot.
		expect(
			readOfferedIds(pickParts(TEXT_SLOT_PART_KIND, [["name", "col:0:key"]])),
		).toEqual(["erEntity.insertColumnAbove", "erEntity.insertColumnBelow"]);
		expect(
			readOfferedIds(
				pickParts(TEXT_SLOT_PART_KIND, [
					["name", "name"],
					["col:1:type", "col:1:type"],
				]),
			),
		).toEqual(["erEntity.insertColumnAbove", "erEntity.insertColumnBelow"]);
	});

	it("offers nothing for a lane pick, which runs down every column", () => {
		expect(
			readOfferedIds(pickParts(ER_ENTITY_LANE_PART_KIND, [["type", "type"]])),
		).toEqual([]);
	});
});
