import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import type { TextSlots } from "../../../../../states/objects/types/TextSlots";
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

const slotsPicked = (
	objectId: string,
	...partIds: string[]
): ObjectPartSelection => ({
	objectId,
	kind: TEXT_SLOT_PART_KIND,
	partIds,
});

describe("readSelectionSlotField", () => {
	it("reads every slot of the object while none is picked", () => {
		const t1 = table("t1", cells("#eef", "#eef"));
		expect(readSelectionSlotField(["t1"], { t1 }, null, "fill")).toEqual({
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
				"fill",
			),
		).toEqual({ kind: "mixed", values: ["#eef", "#fee"] });
	});

	it("reads slots that all leave the field unset as a single undefined", () => {
		// Not `mixed` and not `none`: those slots are drawn alike, so a swatch over
		// them states the one thing they say — that they carry no value.
		const t1 = table("t1", cells(undefined, undefined));
		expect(readSelectionSlotField(["t1"], { t1 }, null, "fill")).toEqual({
			kind: "single",
			value: undefined,
		});
	});

	it("reads an unset slot against a filled one as mixed", () => {
		const t1 = table("t1", cells("#eef", undefined));
		expect(readSelectionSlotField(["t1"], { t1 }, null, "fill")).toEqual({
			kind: "mixed",
			values: ["#eef", undefined],
		});
	});

	it("ignores a part selection naming another object, and one of another kind", () => {
		const t1 = table("t1", cells("#eef", "#fee"));
		const everySlot = { kind: "mixed", values: ["#eef", "#fee"] };
		expect(
			readSelectionSlotField(["t1"], { t1 }, slotsPicked("t2", "r0c0"), "fill"),
		).toEqual(everySlot);
		expect(
			readSelectionSlotField(
				["t1"],
				{ t1 },
				{ objectId: "t1", kind: "row", partIds: ["0"] },
				"fill",
			),
		).toEqual(everySlot);
	});

	it("drops a picked id the object no longer has, and falls back to every slot when none is left", () => {
		const t1 = table("t1", cells("#eef", "#fee"));
		expect(
			readSelectionSlotField(
				["t1"],
				{ t1 },
				slotsPicked("t1", "r0c1", "r9c9"),
				"fill",
			),
		).toEqual({ kind: "single", value: "#fee" });
		expect(
			readSelectionSlotField(["t1"], { t1 }, slotsPicked("t1", "r9c9"), "fill"),
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
				"fill",
			),
		).toEqual({ kind: "mixed", values: ["#eef", "#fee"] });
	});

	it("reads none when nothing selected holds text", () => {
		const bare = { id: "b1", type: "rect" } as unknown as ObjectState;
		expect(readSelectionSlotField(["b1"], { b1: bare }, null, "fill")).toEqual({
			kind: "none",
		});
		expect(readSelectionSlotField([], {}, null, "fill")).toEqual({
			kind: "none",
		});
	});

	it("reads a field holding something other than a string as unset", () => {
		const t1 = table("t1", {
			r0c0: { text: "", fill: 3 },
		} as unknown as TextSlots);
		expect(readSelectionSlotField(["t1"], { t1 }, null, "fill")).toEqual({
			kind: "single",
			value: undefined,
		});
	});
});
