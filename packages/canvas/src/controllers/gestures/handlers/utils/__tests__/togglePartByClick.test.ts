import { describe, expect, it } from "vitest";

import { createObjectPartKindRegistry } from "../../../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import { vertexPartSelection } from "../../../../selection/__tests__/support/vertexPartSelection";
import type {
	ObjectPartRange,
	ObjectPartSelection,
} from "../../../../selection/CanvasSelection";
import {
	createTextSlotPartKindDefinition,
	TEXT_SLOT_PART_KIND,
} from "../../../../selection/partKinds/textSlotPartKind";
import { createVertexPartKindDefinition } from "../../../../selection/partKinds/vertexPartKind";
import { formatPartAddress, textSlotPart, vertexPart } from "../partAddress";
import { togglePartByClick } from "../togglePartByClick";

/** The kind of the 2x2 grid's cells, whose ids spell `<row><column>`. */
const CELL_PART_KIND = "cell";

/** The grid's cells in its own (row-major) order. */
const CELL_IDS = ["00", "01", "10", "11"];

/** The cells the rectangle between two corners spans, in row-major order. */
const collectCellRectangle = (
	_object: ObjectState,
	anchorPartId: string,
	focusPartId: string,
): readonly string[] => {
	const [anchorRow, anchorColumn] = [...anchorPartId].map(Number);
	const [focusRow, focusColumn] = [...focusPartId].map(Number);
	return CELL_IDS.filter((cellId) => {
		const [row, column] = [...cellId].map(Number);
		return (
			row >= Math.min(anchorRow, focusRow) &&
			row <= Math.max(anchorRow, focusRow) &&
			column >= Math.min(anchorColumn, focusColumn) &&
			column <= Math.max(anchorColumn, focusColumn)
		);
	});
};

const grid = (id: string): ObjectState =>
	({ id, type: "grid" }) as unknown as ObjectState;

/** A record-like shape: multiple text slots, declared via features.text = "slots". */
const slotShape = (id: string): ObjectState =>
	({
		id,
		type: "record",
		features: { text: "slots" },
		text: {
			name: { text: "User" },
			fields: { text: "id" },
			rows: { text: ["id: string"] },
		},
	}) as unknown as ObjectState;

/** A polyline carrying two vertices, the parts of its `vertex` kind. */
const poly = (id: string): ObjectState =>
	({
		id,
		type: "polyline",
		points: [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		],
	}) as unknown as ObjectState;

const objectPartKind = createObjectPartKindRegistry();
objectPartKind.register("grid", [
	{
		kind: CELL_PART_KIND,
		has: (_object, partId) => CELL_IDS.includes(partId),
		list: () => CELL_IDS,
		range: collectCellRectangle,
		multiPick: true,
	},
]);
objectPartKind.register("record", [createTextSlotPartKindDefinition()]);
objectPartKind.register("polyline", [createVertexPartKindDefinition(2)]);

const makeState = (
	selectedIds: string[],
	part: ObjectPartSelection | null,
): CanvasControllerState =>
	({
		mode: { kind: "normal" },
		objects: {
			"grid-1": grid("grid-1"),
			"rec-1": slotShape("rec-1"),
			"poly-1": poly("poly-1"),
		},
		selection: selectionOf(selectedIds, part),
		objectMenuOpenId: "alignment",
		stencilLibraryOpenCategory: "basic",
	}) as unknown as CanvasControllerState;

const range = (anchorId: string, focusId: string): ObjectPartRange => ({
	anchorId,
	focusId,
});

const cellSelection = (...ranges: ObjectPartRange[]): ObjectPartSelection => ({
	kind: CELL_PART_KIND,
	ranges,
});

/** Ctrl-clicks one cell of `grid-1` over the given pick. */
const toggleCell = (part: ObjectPartSelection | null, cellId: string) => {
	const state = makeState(["grid-1"], part);
	return togglePartByClick(
		state,
		state.objects["grid-1"],
		formatPartAddress(CELL_PART_KIND, cellId),
		objectPartKind,
	);
};

describe("togglePartByClick", () => {
	it("appends a part no range covers as a range of its own, the active one", () => {
		const next = toggleCell(cellSelection(range("00", "00")), "11");

		expect(next?.selection.part).toEqual(
			cellSelection(range("00", "00"), range("11", "11")),
		);
		expect(next?.selection.objectIds).toEqual(["grid-1"]);
	});

	it("drops a range of the clicked part alone", () => {
		const next = toggleCell(
			cellSelection(range("00", "00"), range("11", "11")),
			"00",
		);

		expect(next?.selection.part).toEqual(cellSelection(range("11", "11")));
	});

	it("breaks a rectangle into the parts it still covers, as the kind's range reads it", () => {
		// 00 → 11 is the whole 2x2 block; taking 01 out leaves the other three
		// one by one, in the kind's own order.
		const next = toggleCell(cellSelection(range("00", "11")), "01");

		expect(next?.selection.part).toEqual(
			cellSelection(range("00", "00"), range("10", "10"), range("11", "11")),
		);
	});

	it("breaks a linear range over `list` when the kind declares no `range`", () => {
		const state = makeState(["rec-1"], {
			kind: TEXT_SLOT_PART_KIND,
			ranges: [range("name", "rows")],
		});

		const next = togglePartByClick(
			state,
			state.objects["rec-1"],
			textSlotPart("fields"),
			objectPartKind,
		);

		expect(next?.selection.part).toEqual({
			kind: TEXT_SLOT_PART_KIND,
			ranges: [range("name", "name"), range("rows", "rows")],
		});
	});

	it("takes the part out of every range covering it, leaving the others", () => {
		const next = toggleCell(
			cellSelection(range("00", "01"), range("01", "01"), range("10", "10")),
			"01",
		);

		expect(next?.selection.part).toEqual(
			cellSelection(range("00", "00"), range("10", "10")),
		);
	});

	it("clears the pick when the last part is taken out, keeping the object selected", () => {
		const next = toggleCell(cellSelection(range("11", "11")), "11");

		expect(next?.selection.part).toBeNull();
		expect(next?.selection.objectIds).toEqual(["grid-1"]);
	});

	it("closes the open submenu and the stencil flyout", () => {
		const next = toggleCell(cellSelection(range("00", "00")), "11");

		expect(next?.objectMenuOpenId).toBeNull();
		expect(next?.stencilLibraryOpenCategory).toBeNull();
	});

	it("is no toggle while nothing is picked", () => {
		expect(toggleCell(null, "00")).toBeNull();
	});

	it("is no toggle for a kind that does not declare multiPick (a vertex)", () => {
		const state = makeState(["poly-1"], vertexPartSelection(0));

		expect(
			togglePartByClick(
				state,
				state.objects["poly-1"],
				vertexPart(1),
				objectPartKind,
			),
		).toBeNull();
	});

	it("is no toggle over a part of a kind other than the picked one", () => {
		const state = makeState(["grid-1"], vertexPartSelection(0));

		expect(
			togglePartByClick(
				state,
				state.objects["grid-1"],
				formatPartAddress(CELL_PART_KIND, "00"),
				objectPartKind,
			),
		).toBeNull();
	});

	it("is no toggle while the object shares the selection with another", () => {
		const state = makeState(
			["grid-1", "rec-1"],
			cellSelection(range("00", "00")),
		);

		expect(
			togglePartByClick(
				state,
				state.objects["grid-1"],
				formatPartAddress(CELL_PART_KIND, "11"),
				objectPartKind,
			),
		).toBeNull();
	});

	it("is no toggle over an id the object does not hold", () => {
		expect(toggleCell(cellSelection(range("00", "00")), "22")).toBeNull();
	});
});
