import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas";
import type { ObjectPartSelection } from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import { remapTablePartSelectionForInsert } from "../remapTablePartSelectionForInsert";

const selectionOf = (
	kind: string,
	partIds: string[],
	anchorPartId?: string,
): ObjectPartSelection => ({ objectId: "t-1", kind, partIds, anchorPartId });

describe("remapTablePartSelectionForInsert", () => {
	it("moves the cells at or past the inserted row down one", () => {
		const moved = remapTablePartSelectionForInsert(
			selectionOf(TEXT_SLOT_PART_KIND, ["r0c1", "r1c1", "r2c1"]),
			"row",
			1,
		);

		expect(moved.partIds).toEqual(["r0c1", "r2c1", "r3c1"]);
	});

	it("moves the cells at or past the inserted column right one", () => {
		const moved = remapTablePartSelectionForInsert(
			selectionOf(TEXT_SLOT_PART_KIND, ["r1c0", "r1c1", "r1c2"]),
			"column",
			1,
		);

		expect(moved.partIds).toEqual(["r1c0", "r1c2", "r1c3"]);
	});

	it("moves the anchor with the range it anchors", () => {
		const moved = remapTablePartSelectionForInsert(
			selectionOf(TEXT_SLOT_PART_KIND, ["r1c0", "r2c0"], "r2c0"),
			"row",
			0,
		);

		expect(moved.partIds).toEqual(["r2c0", "r3c0"]);
		expect(moved.anchorPartId).toBe("r3c0");
	});

	it("moves a track selection of the axis that grew", () => {
		expect(
			remapTablePartSelectionForInsert(selectionOf("row", ["1"]), "row", 1)
				.partIds,
		).toEqual(["2"]);
		expect(
			remapTablePartSelectionForInsert(selectionOf("row", ["0"]), "row", 1)
				.partIds,
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
