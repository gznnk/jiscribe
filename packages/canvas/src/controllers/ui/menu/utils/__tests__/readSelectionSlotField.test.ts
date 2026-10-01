import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import type { TextSlots } from "../../../../../states/objects/types/TextSlots";
import {
	createTextSlotPartRegistry,
	NON_SLOT_PART_KIND,
	registerSlotGroupParts,
	SLOT_GROUP_PART_KIND,
} from "../../../../selection/__tests__/support/textSlotPartRegistry";
import type { ObjectPartSelection } from "../../../../selection/ObjectPartSelection";
import { TEXT_SLOT_PART_KIND } from "../../../../selection/textSlotPartKind";
import { readSelectionSlotField } from "../readSelectionSlotField";

/** A slotted shape whose cells carry a field of the type's own (`fill`). */
const table = (id: string, text: TextSlots): ObjectState =>
	({
		id,
		type: "table",
		features: { type: "table", geometry: "point", text: "slots" },
		text,
	}) as unknown as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

const cells = (...fills: (string | undefined)[]): TextSlots =>
	Object.fromEntries(
		fills.map((fill, index) => [
			`r0c${index}`,
			{ text: "", ...(fill === undefined ? {} : { fill }) },
		]),
	) as TextSlots;

/** The cells of a two-row grid, row-major, as `r<row>c<column>`. */
const grid = (
	rowCount: number,
	...fills: (string | undefined)[]
): TextSlots => {
	const columnCount = fills.length / rowCount;
	return Object.fromEntries(
		fills.map((fill, index) => [
			`r${Math.floor(index / columnCount)}c${index % columnCount}`,
			{ text: "", ...(fill === undefined ? {} : { fill }) },
		]),
	) as TextSlots;
};

const slotsPicked = (
	objectId: string,
	...partIds: string[]
): ObjectPartSelection => ({
	objectId,
	kind: TEXT_SLOT_PART_KIND,
	partIds,
});

/**
 * The registry a canvas holding the fixture types would carry: cells on both,
 * plus the table's two other kinds — one standing for a group of cells (a row),
 * one covering none.
 */
const objectPartKind = createTextSlotPartRegistry("table", "group");
registerSlotGroupParts(objectPartKind, "table");

describe("readSelectionSlotField", () => {
	it("reads every slot of the object while none is picked", () => {
		const t1 = table("t1", cells("#eef", "#eef"));
		expect(
			readSelectionSlotField(["t1"], { t1 }, null, objectPartKind, "fill"),
		).toEqual({
			kind: "single",
			value: "#eef",
		});
	});

	it("reads the picked slots alone", () => {
		const t1 = table("t1", cells("#eef", "#fee", "#fee"));
		expect(
			readSelectionSlotField(
				["t1"],
				{ t1 },
				slotsPicked("t1", "r0c1", "r0c2"),
				objectPartKind,
				"fill",
			),
		).toEqual({ kind: "single", value: "#fee" });
	});

	it("reads a picked range whose slots disagree as mixed, in order of first appearance", () => {
		const t1 = table("t1", cells("#eef", "#fee", "#eef"));
		expect(
			readSelectionSlotField(
				["t1"],
				{ t1 },
				slotsPicked("t1", "r0c0", "r0c1", "r0c2"),
				objectPartKind,
				"fill",
			),
		).toEqual({ kind: "mixed", values: ["#eef", "#fee"] });
	});

	it("reads slots that all leave the field unset as a single undefined", () => {
		// Not `mixed` and not `none`: those slots are drawn alike, so a swatch over
		// them states the one thing they say — that they carry no value.
		const t1 = table("t1", cells(undefined, undefined));
		expect(
			readSelectionSlotField(["t1"], { t1 }, null, objectPartKind, "fill"),
		).toEqual({
			kind: "single",
			value: undefined,
		});
	});

	it("reads an unset slot against a filled one as mixed", () => {
		const t1 = table("t1", cells("#eef", undefined));
		expect(
			readSelectionSlotField(["t1"], { t1 }, null, objectPartKind, "fill"),
		).toEqual({
			kind: "mixed",
			values: ["#eef", undefined],
		});
	});

	it("ignores a part selection naming another object, and one of a kind covering no slot", () => {
		const t1 = table("t1", cells("#eef", "#fee"));
		const everySlot = { kind: "mixed", values: ["#eef", "#fee"] };
		expect(
			readSelectionSlotField(
				["t1"],
				{ t1 },
				slotsPicked("t2", "r0c0"),
				objectPartKind,
				"fill",
			),
		).toEqual(everySlot);
		expect(
			readSelectionSlotField(
				["t1"],
				{ t1 },
				{ objectId: "t1", kind: NON_SLOT_PART_KIND, partIds: ["tip"] },
				objectPartKind,
				"fill",
			),
		).toEqual(everySlot);
		// A kind the type does not declare at all reads the same way.
		expect(
			readSelectionSlotField(
				["t1"],
				{ t1 },
				{ objectId: "t1", kind: "column", partIds: ["0"] },
				objectPartKind,
				"fill",
			),
		).toEqual(everySlot);
	});

	it("reads the slots a picked kind of the type's own covers, and nothing else", () => {
		// Two rows disagreeing with each other, each row agreeing with itself.
		const t1 = table("t1", grid(2, "#eef", "#eef", "#fee", "#fee"));
		expect(
			readSelectionSlotField(
				["t1"],
				{ t1 },
				{ objectId: "t1", kind: SLOT_GROUP_PART_KIND, partIds: ["1"] },
				objectPartKind,
				"fill",
			),
		).toEqual({ kind: "single", value: "#fee" });
	});

	it("reads a picked kind whose slots disagree as mixed over those slots alone", () => {
		// The whole table is mixed too, so only the values tell the two readings
		// apart: the second row's color is not among them.
		const t1 = table("t1", grid(2, "#eef", "#fee", "#aaf", "#aaf"));
		expect(
			readSelectionSlotField(
				["t1"],
				{ t1 },
				{ objectId: "t1", kind: SLOT_GROUP_PART_KIND, partIds: ["0"] },
				objectPartKind,
				"fill",
			),
		).toEqual({ kind: "mixed", values: ["#eef", "#fee"] });
	});

	it("drops a picked id the object no longer has, and falls back to every slot when none is left", () => {
		const t1 = table("t1", cells("#eef", "#fee"));
		expect(
			readSelectionSlotField(
				["t1"],
				{ t1 },
				slotsPicked("t1", "r0c1", "r9c9"),
				objectPartKind,
				"fill",
			),
		).toEqual({ kind: "single", value: "#fee" });
		expect(
			readSelectionSlotField(
				["t1"],
				{ t1 },
				slotsPicked("t1", "r9c9"),
				objectPartKind,
				"fill",
			),
		).toEqual({ kind: "mixed", values: ["#eef", "#fee"] });
	});

	it("folds the slots of every object the selection reaches, descendants of a group included", () => {
		const g1 = group("g1", ["t1", "t2"]);
		const t1 = table("t1", cells("#eef"));
		const t2 = table("t2", cells("#fee"));
		expect(
			readSelectionSlotField(
				["g1"],
				{ g1: g1 as unknown as ObjectState, t1, t2 },
				null,
				objectPartKind,
				"fill",
			),
		).toEqual({ kind: "mixed", values: ["#eef", "#fee"] });
	});

	it("reads none when nothing selected holds text", () => {
		const bare = { id: "b1", type: "rect" } as unknown as ObjectState;
		expect(
			readSelectionSlotField(
				["b1"],
				{ b1: bare },
				null,
				objectPartKind,
				"fill",
			),
		).toEqual({
			kind: "none",
		});
		expect(
			readSelectionSlotField([], {}, null, objectPartKind, "fill"),
		).toEqual({
			kind: "none",
		});
	});

	it("reads a field holding something other than a string as unset", () => {
		const t1 = table("t1", {
			r0c0: { text: "", fill: 3 },
		} as unknown as TextSlots);
		expect(
			readSelectionSlotField(["t1"], { t1 }, null, objectPartKind, "fill"),
		).toEqual({
			kind: "single",
			value: undefined,
		});
	});
});
