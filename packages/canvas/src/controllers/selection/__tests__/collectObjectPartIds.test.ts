import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { collectObjectPartIds } from "../collectObjectPartIds";
import type { ObjectPartKindDefinition } from "../ObjectPartKindRegistry";
import type { ObjectPartSelection } from "../ObjectPartSelection";

/** A shape whose parts are the four cells of a 2x2 grid, keyed r<row>c<column>. */
const grid = {
	id: "t1",
	type: "table",
} as unknown as ObjectState;

const CELL_IDS = ["r0c0", "r0c1", "r1c0", "r1c1"];

/** A kind whose parts lie in one line, so the linear default over `list` applies. */
const linearKind: ObjectPartKindDefinition = {
	kind: "cell",
	has: (_object, partId) => CELL_IDS.includes(partId),
	list: () => CELL_IDS,
};

/** The same parts, but with the type reading a range as the rectangle it spans. */
const rectangularKind: ObjectPartKindDefinition = {
	...linearKind,
	range: (_object, anchorPartId, focusPartId) => {
		const [anchorRow, anchorColumn] = [...anchorPartId].filter(
			(character) => character !== "r" && character !== "c",
		);
		const [focusRow, focusColumn] = [...focusPartId].filter(
			(character) => character !== "r" && character !== "c",
		);
		const rows = [anchorRow, focusRow].sort();
		const columns = [anchorColumn, focusColumn].sort();
		return CELL_IDS.filter(
			(cellId) =>
				cellId[1] >= rows[0] &&
				cellId[1] <= rows[1] &&
				cellId[3] >= columns[0] &&
				cellId[3] <= columns[1],
		);
	},
};

const selection = (
	ranges: ObjectPartSelection["ranges"],
): ObjectPartSelection => ({ objectId: "t1", kind: "cell", ranges });

describe("collectObjectPartIds", () => {
	it("covers the one part a collapsed range names", () => {
		expect(
			collectObjectPartIds(
				selection([{ anchorId: "r1c0", focusId: "r1c0" }]),
				linearKind,
				grid,
			),
		).toEqual(["r1c0"]);
	});

	it("covers the run between the ends, in the type's own order", () => {
		expect(
			collectObjectPartIds(
				selection([{ anchorId: "r0c1", focusId: "r1c0" }]),
				linearKind,
				grid,
			),
		).toEqual(["r0c1", "r1c0"]);
	});

	it("reads a range backwards the same way as forwards", () => {
		expect(
			collectObjectPartIds(
				selection([{ anchorId: "r1c1", focusId: "r0c1" }]),
				linearKind,
				grid,
			),
		).toEqual(["r0c1", "r1c0", "r1c1"]);
	});

	it("asks the kind that lays its parts out in two dimensions", () => {
		expect(
			collectObjectPartIds(
				selection([{ anchorId: "r0c1", focusId: "r1c1" }]),
				rectangularKind,
				grid,
			),
		).toEqual(["r0c1", "r1c1"]);
	});

	it("walks the ranges in order and keeps duplicates out", () => {
		expect(
			collectObjectPartIds(
				selection([
					{ anchorId: "r1c0", focusId: "r1c1" },
					{ anchorId: "r0c0", focusId: "r1c0" },
				]),
				linearKind,
				grid,
			),
		).toEqual(["r1c0", "r1c1", "r0c0", "r0c1"]);
	});

	it("collapses a range the kind cannot place onto its focus", () => {
		expect(
			collectObjectPartIds(
				selection([{ anchorId: "r9c9", focusId: "r0c1" }]),
				linearKind,
				grid,
			),
		).toEqual(["r0c1"]);
		// A kind that cannot be walked at all is in the same position.
		expect(
			collectObjectPartIds(
				selection([{ anchorId: "r0c0", focusId: "r0c1" }]),
				{ kind: "cell", has: () => true },
				grid,
			),
		).toEqual(["r0c1"]);
	});
});
