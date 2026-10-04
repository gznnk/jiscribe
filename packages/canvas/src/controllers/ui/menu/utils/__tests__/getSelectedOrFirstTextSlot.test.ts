import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import { createObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import type { TextSlots } from "../../../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import {
	createTextSlotPartRegistry,
	NON_SLOT_PART_KIND,
	registerSlotGroupParts,
	SLOT_GROUP_PART_KIND,
} from "../../../../selection/__tests__/support/textSlotPartRegistry";
import type { ObjectPartSelection } from "../../../../selection/ObjectPartSelection";
import { TEXT_SLOT_PART_KIND } from "../../../../selection/textSlotPartKind";
import { getSelectedOrFirstTextSlot } from "../getSelectedOrFirstTextSlot";

/** The types under test register no defaults, so the resolution is the identity here. */
const textStyleDefaults = createObjectTextStyleDefaultsRegistry();

const rect = (id: string, text?: TextSlots): ObjectState =>
	({
		id,
		type: "rect",
		features: { text: "slots" },
		...(text ? { text } : {}),
	}) as unknown as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

const makeState = (
	selectedIds: string[],
	objects: Record<string, ObjectState>,
	part: ObjectPartSelection | null = null,
): CanvasControllerState =>
	({
		selection: selectionOf(selectedIds, part),
		objects,
	}) as unknown as CanvasControllerState;

/** Every fixture here wears the rect type with features.text: "slots". */
const objectPartKind = createTextSlotPartRegistry("rect");

/**
 * The same, plus two kinds of the type's own: one standing for a group of slots
 * the way a table's row does over its cells, and one naming something other than
 * text, which covers no slot at all.
 */
const objectPartWithTracks = createTextSlotPartRegistry();
registerSlotGroupParts(objectPartWithTracks, "rect");

describe("getSelectedOrFirstTextSlot", () => {
	it("returns undefined when nothing is selected", () => {
		expect(
			getSelectedOrFirstTextSlot(
				makeState([], {}),
				textStyleDefaults,
				objectPartKind,
			),
		).toBeUndefined();
	});

	it("returns undefined when nothing selected holds text", () => {
		const r = rect("r1");
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1"], { r1: r }),
				textStyleDefaults,
				objectPartKind,
			),
		).toBeUndefined();
	});

	it("returns the body slot of a single-slot shape", () => {
		const r = rect("r1", { body: { text: "hello", fontSize: 20 } });
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1"], { r1: r }),
				textStyleDefaults,
				objectPartKind,
			),
		).toEqual({
			text: "hello",
			fontSize: 20,
		});
	});

	it("returns the first slot of a multi-slot shape, matching the editing default", () => {
		const r = rect("r1", {
			name: { text: "User", fontWeight: "bold" },
			rows: { text: ["id"], fontWeight: "normal" },
		});
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1"], { r1: r }),
				textStyleDefaults,
				objectPartKind,
			)?.fontWeight,
		).toBe("bold");
	});

	it("takes the first selected object that holds text", () => {
		const textless = rect("r1");
		const withText = rect("r2", { body: { text: "hello", fontSize: 20 } });
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1", "r2"], { r1: textless, r2: withText }),
				textStyleDefaults,
				objectPartKind,
			),
		).toEqual({ text: "hello", fontSize: 20 });
	});

	it("descends into a selected group", () => {
		const g = group("g1", ["r1"]);
		const r = rect("r1", { body: { text: "hello", fontSize: 20 } });
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["g1"], { g1: g, r1: r }),
				textStyleDefaults,
				objectPartKind,
			),
		).toEqual({ text: "hello", fontSize: 20 });
	});

	it("returns undefined for a shape whose slot map is empty", () => {
		const r = rect("r1", {});
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1"], { r1: r }),
				textStyleDefaults,
				objectPartKind,
			),
		).toBeUndefined();
	});

	it("returns the selected slot rather than the first one", () => {
		const r = rect("r1", {
			name: { text: "User", fontSize: 16 },
			rows: { text: ["id"], fontSize: 11 },
		});
		expect(
			getSelectedOrFirstTextSlot(
				makeState(
					["r1"],
					{ r1: r },
					{
						kind: TEXT_SLOT_PART_KIND,
						ranges: [{ anchorId: "rows", focusId: "rows" }],
					},
				),
				textStyleDefaults,
				objectPartKind,
			)?.fontSize,
		).toBe(11);
	});

	it("reports what a range of slots agrees on and leaves the rest unset", () => {
		const r = rect("r1", {
			name: { text: "User", fontSize: 16, textAlign: "center" },
			rows: { text: ["id"], fontSize: 16, textAlign: "left" },
		});
		const style = getSelectedOrFirstTextSlot(
			makeState(
				["r1"],
				{ r1: r },
				{
					kind: TEXT_SLOT_PART_KIND,
					ranges: [{ anchorId: "name", focusId: "rows" }],
				},
			),
			textStyleDefaults,
			objectPartKind,
		);
		expect(style?.fontSize).toBe(16);
		// The two disagree, so the field reads as unset (the "mixed" convention).
		expect(style?.textAlign).toBeUndefined();
		// A range stands for no one text, so the content is empty.
		expect(style?.text).toBe("");
	});

	describe("a picked kind that stands for a group of slots (a table's row)", () => {
		const grid = rect("r1", {
			r0c0: { text: "a", fontSize: 11 },
			r0c1: { text: "b", fontSize: 11 },
			r1c0: { text: "c", fontSize: 24 },
			r1c1: { text: "d", fontSize: 30 },
		});
		const rowPicked = (...rowIds: string[]): CanvasControllerState =>
			makeState(
				["r1"],
				{ r1: grid },
				{
					kind: SLOT_GROUP_PART_KIND,
					ranges: rowIds.map((rowId) => ({
						anchorId: rowId,
						focusId: rowId,
					})),
				},
			);

		it("reads what the slots that kind covers agree on", () => {
			expect(
				getSelectedOrFirstTextSlot(
					rowPicked("0"),
					textStyleDefaults,
					objectPartWithTracks,
				)?.fontSize,
			).toBe(11);
		});

		it("leaves a field those slots disagree on unset, without looking at the rest", () => {
			// The first row agrees on 11, so a read of the whole object would not be
			// unset — the second row's own disagreement is what has to show.
			expect(
				getSelectedOrFirstTextSlot(
					rowPicked("1"),
					textStyleDefaults,
					objectPartWithTracks,
				)?.fontSize,
			).toBeUndefined();
		});

		it("falls back to the first slot for a picked kind that covers none", () => {
			expect(
				getSelectedOrFirstTextSlot(
					makeState(
						["r1"],
						{ r1: grid },
						{
							kind: NON_SLOT_PART_KIND,
							ranges: [{ anchorId: "tip", focusId: "tip" }],
						},
					),
					textStyleDefaults,
					objectPartWithTracks,
				)?.fontSize,
			).toBe(11);
		});
	});
});

/**
 * While an editor is open with a stretch selected, the menus follow that stretch
 * — except on a body written in a source language, whose characters carry no
 * styling of their own, so the whole slot is read and the write lands there too
 * (TextSlotStyleProperty).
 */
describe("getSelectedOrFirstTextSlot while a stretch of text is edited", () => {
	const editingState = (
		object: ObjectState,
		content: RichText,
	): CanvasControllerState =>
		({
			selection: selectionOf(["r1"]),
			objects: { r1: object },
			textEditState: {
				kind: "shape",
				objectId: "r1",
				slotId: BODY_TEXT_SLOT_ID,
				text: content,
				selection: { start: 0, end: 2 },
			},
		}) as unknown as CanvasControllerState;

	const sourceRect = (text: TextSlots): ObjectState =>
		({
			id: "r1",
			type: "markdown",
			features: { type: "markdown", geometry: "rect", text: "source" },
			text,
		}) as unknown as ObjectState;

	it("reads the styling of the selected characters of an ordinary body", () => {
		const r = rect("r1", {
			body: {
				text: [{ text: "he", fontSize: 30 }, { text: "llo" }],
				fontSize: 20,
			},
		});
		expect(
			getSelectedOrFirstTextSlot(
				// The draft the editor holds is what the offsets address.
				editingState(r, [{ text: "he", fontSize: 30 }, { text: "llo" }]),
				textStyleDefaults,
				objectPartKind,
			)?.fontSize,
		).toBe(30);
	});

	it("reads the whole slot of a source-language body", () => {
		const r = sourceRect({ body: { text: "# Title", fontSize: 20 } });
		expect(
			getSelectedOrFirstTextSlot(
				editingState(r, "# Title"),
				textStyleDefaults,
				objectPartKind,
			),
		).toEqual({ text: "# Title", fontSize: 20 });
	});
});

describe("getSelectedOrFirstTextSlot with the type's own defaults", () => {
	/** A registry standing in for a type whose bodies are left/top unless said otherwise. */
	const leftTop = createObjectTextStyleDefaultsRegistry();
	leftTop.register("rect", {
		bySlot: {
			[BODY_TEXT_SLOT_ID]: { textAlign: "left", verticalAlign: "top" },
		},
	});

	it("reports the type's default for a field the slot leaves unset", () => {
		const r = rect("r1", { body: { text: "hello" } });
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1"], { r1: r }),
				leftTop,
				objectPartKind,
			),
		).toEqual({ text: "hello", textAlign: "left", verticalAlign: "top" });
	});

	it("reports the slot's own value where it has one", () => {
		const r = rect("r1", { body: { text: "hello", textAlign: "right" } });
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1"], { r1: r }),
				leftTop,
				objectPartKind,
			)?.textAlign,
		).toBe("right");
	});
});
