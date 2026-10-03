import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas";
import type { ObjectPartSelection } from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import { remapTablePartSelectionForInsert } from "../remapTablePartSelectionForInsert";

/** A selection of collapsed ranges, one per id — what a grip or a cell click writes. */
const selectionOf = (kind: string, partIds: string[]): ObjectPartSelection => ({
	objectId: "t-1",
	kind,
	ranges: partIds.map((partId) => ({ anchorId: partId, focusId: partId })),
});

/** The ids of a selection whose ranges are all collapsed. */
const collapsedIds = (selection: ObjectPartSelection): string[] =>
	selection.ranges.map((range) => range.anchorId);

describe("remapTablePartSelectionForInsert", () => {
	it("moves the cells at or past the inserted row down one", () => {
		const moved = remapTablePartSelectionForInsert(
			selectionOf(TEXT_SLOT_PART_KIND, ["r0c1", "r1c1", "r2c1"]),
			"row",
			1,
		);

		expect(collapsedIds(moved)).toEqual(["r0c1", "r2c1", "r3c1"]);
	});

	it("moves the cells at or past the inserted column right one", () => {
		const moved = remapTablePartSelectionForInsert(
			selectionOf(TEXT_SLOT_PART_KIND, ["r1c0", "r1c1", "r1c2"]),
			"column",
			1,
		);

		expect(collapsedIds(moved)).toEqual(["r1c0", "r1c2", "r1c3"]);
	});

	it("moves both ends of a range, the anchor as readily as the focus", () => {
		const moved = remapTablePartSelectionForInsert(
			{
				objectId: "t-1",
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: "r2c0", focusId: "r1c0" }],
			},
			"row",
			0,
		);

		expect(moved.ranges).toEqual([{ anchorId: "r3c0", focusId: "r2c0" }]);
	});

	it("moves a track selection of the axis that grew", () => {
		expect(
			collapsedIds(
				remapTablePartSelectionForInsert(selectionOf("row", ["1"]), "row", 1),
			),
		).toEqual(["2"]);
		expect(
			collapsedIds(
				remapTablePartSelectionForInsert(selectionOf("row", ["0"]), "row", 1),
			),
		).toEqual(["0"]);
	});

	it("leaves the other axis alone, and returns the selection itself when nothing moved", () => {
		const columns = selectionOf("column", ["1", "2"]);
		expect(remapTablePartSelectionForInsert(columns, "row", 0)).toBe(columns);

		const aboveTheInsertion = selectionOf(TEXT_SLOT_PART_KIND, ["r0c0"]);
		expect(remapTablePartSelectionForInsert(aboveTheInsertion, "row", 1)).toBe(
			aboveTheInsertion,
		);
	});

	it("leaves an id it cannot read as a position untouched", () => {
		const foreign = selectionOf(TEXT_SLOT_PART_KIND, ["body"]);
		expect(remapTablePartSelectionForInsert(foreign, "row", 0)).toBe(foreign);
	});
});
