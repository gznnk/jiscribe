import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import { createObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import type { TextSlots } from "../../../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../../../CanvasTypes";
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
	selectedTextSlot: CanvasControllerState["selectedTextSlot"] = null,
): CanvasControllerState =>
	({
		selectedIds,
		objects,
		selectedTextSlot,
	}) as unknown as CanvasControllerState;

describe("getSelectedOrFirstTextSlot", () => {
	it("returns undefined when nothing is selected", () => {
		expect(
			getSelectedOrFirstTextSlot(makeState([], {}), textStyleDefaults),
		).toBeUndefined();
	});

	it("returns undefined when nothing selected holds text", () => {
		const r = rect("r1");
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1"], { r1: r }),
				textStyleDefaults,
			),
		).toBeUndefined();
	});

	it("returns the body slot of a single-slot shape", () => {
		const r = rect("r1", { body: { text: "hello", fontSize: 20 } });
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1"], { r1: r }),
				textStyleDefaults,
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
			),
		).toEqual({ text: "hello", fontSize: 20 });
	});

	it("returns undefined for a shape whose slot map is empty", () => {
		const r = rect("r1", {});
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1"], { r1: r }),
				textStyleDefaults,
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
				makeState(["r1"], { r1: r }, { objectId: "r1", slotId: "rows" }),
				textStyleDefaults,
			)?.fontSize,
		).toBe(11);
	});

	it("falls back to the first slot when the slot selection is stale", () => {
		const r1 = rect("r1", {
			name: { text: "User", fontSize: 16 },
			rows: { text: ["id"], fontSize: 11 },
		});
		const r2 = rect("r2", { body: { text: "other", fontSize: 30 } });
		// The slot's object is no longer the sole selection
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1", "r2"], { r1, r2 }, { objectId: "r1", slotId: "rows" }),
				textStyleDefaults,
			)?.fontSize,
		).toBe(16);
		// The slot itself is gone from the object
		expect(
			getSelectedOrFirstTextSlot(
				makeState(["r1"], { r1 }, { objectId: "r1", slotId: "operations" }),
				textStyleDefaults,
			)?.fontSize,
		).toBe(16);
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
			selectedIds: ["r1"],
			objects: { r1: object },
			selectedTextSlot: null,
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
			)?.fontSize,
		).toBe(30);
	});

	it("reads the whole slot of a source-language body", () => {
		const r = sourceRect({ body: { text: "# Title", fontSize: 20 } });
		expect(
			getSelectedOrFirstTextSlot(editingState(r, "# Title"), textStyleDefaults),
		).toEqual({ text: "# Title", fontSize: 20 });
	});
});

describe("getSelectedOrFirstTextSlot with the type's own defaults", () => {
	/** A registry standing in for a type whose bodies are left/top unless said otherwise. */
	const leftTop = createObjectTextStyleDefaultsRegistry();
	leftTop.register("rect", {
		[BODY_TEXT_SLOT_ID]: { textAlign: "left", verticalAlign: "top" },
	});

	it("reports the type's default for a field the slot leaves unset", () => {
		const r = rect("r1", { body: { text: "hello" } });
		expect(
			getSelectedOrFirstTextSlot(makeState(["r1"], { r1: r }), leftTop),
		).toEqual({ text: "hello", textAlign: "left", verticalAlign: "top" });
	});

	it("reports the slot's own value where it has one", () => {
		const r = rect("r1", { body: { text: "hello", textAlign: "right" } });
		expect(
			getSelectedOrFirstTextSlot(makeState(["r1"], { r1: r }), leftTop)
				?.textAlign,
		).toBe("right");
	});
});
