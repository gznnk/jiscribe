import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import { createObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import type { ObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";
import { createObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../states/objects/primitives/group/GroupState";
import type { TextSlots } from "../../../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { selectionOf } from "../../../../selection/__tests__/support/selectionOf";
import type { ObjectPartSelection } from "../../../../selection/ObjectPartSelection";
import { TEXT_SLOT_PART_KIND } from "../../../../selection/textSlotPartKind";
import { coreStyleTable } from "../../../../style/coreStyleTable";
import type { StyleIntentRegistries } from "../../../../style/ObjectStyleRegistry";
import { createObjectStyleRegistry } from "../../../../style/ObjectStyleRegistry";
import { readSelectionTextStyle } from "../readSelectionTextStyle";

/**
 * The reader's registries, with the style tables of every type these fixtures
 * use wired the way applyObjectDefinition wires them (`fontColor` is answered
 * there rather than off the first slot).
 *
 * @param textStyleDefaults - The per-type text-style defaults; an empty registry makes the resolution the identity
 */
const registriesOf = (
	textStyleDefaults: ObjectTextStyleDefaultsRegistry,
): StyleIntentRegistries => {
	const objectStyle = createObjectStyleRegistry();
	for (const type of ["rect", "plain", "markdown"]) {
		objectStyle.register(
			type,
			coreStyleTable({ type, geometry: "rect", text: "slots" }),
		);
	}
	return {
		objectStyle,
		objectShapeStyleDefaults: createObjectShapeStyleDefaultsRegistry(),
		objectTextStyleDefaults: textStyleDefaults,
	};
};

/** The types under test register no defaults, so the resolution is the identity here. */
const registries = registriesOf(createObjectTextStyleDefaultsRegistry());

const rect = (id: string, text?: TextSlots, type = "rect"): ObjectState =>
	({
		id,
		type,
		features: { type, geometry: "rect", text: "slots" },
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

/** An object being edited on its body slot, with its first two characters selected. */
const editingState = (
	object: ObjectState,
	content: RichText,
): CanvasControllerState =>
	({
		selection: selectionOf(["a"]),
		objects: { a: object },
		textEditState: {
			kind: "shape",
			text: content,
			selection: { start: 0, end: 2 },
		},
	}) as unknown as CanvasControllerState;

describe("readSelectionTextStyle", () => {
	it("nothing selected → every field is none", () => {
		const style = readSelectionTextStyle(makeState([], {}), registries);
		expect(style.fontSize).toEqual({ kind: "none" });
		expect(style.textAlign).toEqual({ kind: "none" });
	});

	it("nothing selected holds text → none", () => {
		const objects = { a: rect("a") };
		expect(
			readSelectionTextStyle(makeState(["a"], objects), registries).fontSize,
		).toEqual({ kind: "none" });
	});

	it("one shape → its own slot's values", () => {
		const objects = { a: rect("a", { body: { text: "hi", fontSize: 20 } }) };
		expect(
			readSelectionTextStyle(makeState(["a"], objects), registries).fontSize,
		).toEqual({ kind: "single", value: 20 });
	});

	it("two shapes agreeing → one value", () => {
		const objects = {
			a: rect("a", { body: { text: "hi", fontSize: 20 } }),
			b: rect("b", { body: { text: "yo", fontSize: 20 } }),
		};
		expect(
			readSelectionTextStyle(makeState(["a", "b"], objects), registries)
				.fontSize,
		).toEqual({ kind: "single", value: 20 });
	});

	it("two shapes disagreeing → mixed, one field at a time", () => {
		const objects = {
			a: rect("a", { body: { text: "hi", fontSize: 20, textAlign: "center" } }),
			b: rect("b", { body: { text: "yo", fontSize: 12, textAlign: "center" } }),
		};
		const style = readSelectionTextStyle(
			makeState(["a", "b"], objects),
			registries,
		);
		expect(style.fontSize).toEqual({ kind: "mixed", values: [20, 12] });
		expect(style.textAlign).toEqual({ kind: "single", value: "center" });
	});

	it("a field neither slot sets → one value, and that value is undefined", () => {
		const objects = {
			a: rect("a", { body: { text: "hi" } }),
			b: rect("b", { body: { text: "yo" } }),
		};
		expect(
			readSelectionTextStyle(makeState(["a", "b"], objects), registries)
				.fontWeight,
		).toEqual({ kind: "single", value: undefined });
	});

	it("a field one slot sets and the other leaves unset → mixed", () => {
		const objects = {
			a: rect("a", { body: { text: "hi", fontWeight: "bold" } }),
			b: rect("b", { body: { text: "yo" } }),
		};
		expect(
			readSelectionTextStyle(makeState(["a", "b"], objects), registries)
				.fontWeight,
		).toEqual({ kind: "mixed", values: ["bold", undefined] });
	});

	it("a size stated outright and the same size coming from the type's defaults → one value", () => {
		const defaults = createObjectTextStyleDefaultsRegistry();
		defaults.register("plain", { bySlot: { body: { fontSize: 14 } } });
		const objects = {
			stated: rect("stated", { body: { text: "hi", fontSize: 14 } }),
			// Writes nothing, so its type's default is what it draws
			defaulted: rect("defaulted", { body: { text: "yo" } }, "plain"),
		};
		expect(
			readSelectionTextStyle(
				makeState(["stated", "defaulted"], objects),
				registriesOf(defaults),
			).fontSize,
		).toEqual({ kind: "single", value: 14 });
	});

	it("descendants of a selected group have their say", () => {
		const objects = {
			g: group("g", ["a", "b"]),
			a: rect("a", { body: { text: "hi", fontSize: 20 } }),
			b: rect("b", { body: { text: "yo", fontSize: 12 } }),
		};
		expect(
			readSelectionTextStyle(makeState(["g"], objects), registries).fontSize,
		).toEqual({ kind: "mixed", values: [20, 12] });
	});

	it("a slot picked below the object narrows the whole thing to that slot", () => {
		const objects = {
			a: rect("a", {
				name: { text: "User", fontSize: 20 },
				rows: { text: ["id"], fontSize: 12 },
			}),
		};
		expect(
			readSelectionTextStyle(
				makeState(["a"], objects, {
					kind: TEXT_SLOT_PART_KIND,
					ranges: [{ anchorId: "rows", focusId: "rows" }],
				}),
				registries,
			).fontSize,
		).toEqual({ kind: "single", value: 12 });
	});

	it("only the first slot of a multi-slot shape has a say otherwise", () => {
		const objects = {
			a: rect("a", {
				name: { text: "User", fontSize: 20 },
				rows: { text: ["id"], fontSize: 12 },
			}),
		};
		expect(
			readSelectionTextStyle(makeState(["a"], objects), registries).fontSize,
		).toEqual({ kind: "single", value: 20 });
	});
});

describe("readSelectionTextStyle while a stretch of text is edited", () => {
	it("narrows to the selected characters of an ordinary body", () => {
		const a = rect("a", {
			body: {
				text: [{ text: "hi", fontSize: 30 }, { text: "!" }],
				fontSize: 20,
			},
		});
		expect(
			// The draft the editor holds is what the offsets address.
			readSelectionTextStyle(
				editingState(a, [{ text: "hi", fontSize: 30 }, { text: "!" }]),
				registries,
			).fontSize,
		).toEqual({ kind: "single", value: 30 });
	});

	it("reads the whole slot of a source-language body, which the write also lands on", () => {
		const a = {
			id: "a",
			type: "markdown",
			features: { type: "markdown", geometry: "rect", text: "source" },
			text: { body: { text: "# Title", fontSize: 20 } },
		} as unknown as ObjectState;
		expect(
			readSelectionTextStyle(editingState(a, "# Title"), registries).fontSize,
		).toEqual({ kind: "single", value: 20 });
	});
});
