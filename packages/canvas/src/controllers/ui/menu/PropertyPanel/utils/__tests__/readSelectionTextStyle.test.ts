import { createObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectTextStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import type { TextSlots } from "../../../../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { readSelectionTextStyle } from "../readSelectionTextStyle";

/** The types under test register no defaults, so the resolution is the identity here. */
const textStyleDefaults = createObjectTextStyleDefaultsRegistry();

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
	selectedTextSlot: CanvasControllerState["selectedTextSlot"] = null,
): CanvasControllerState =>
	({
		selectedIds,
		objects,
		selectedTextSlot,
	}) as unknown as CanvasControllerState;

describe("readSelectionTextStyle", () => {
	it("nothing selected → every field is none", () => {
		const style = readSelectionTextStyle(makeState([], {}), textStyleDefaults);
		expect(style.fontSize).toEqual({ kind: "none" });
		expect(style.textAlign).toEqual({ kind: "none" });
	});

	it("nothing selected holds text → none", () => {
		const objects = { a: rect("a") };
		expect(
			readSelectionTextStyle(makeState(["a"], objects), textStyleDefaults)
				.fontSize,
		).toEqual({ kind: "none" });
	});

	it("one shape → its own slot's values", () => {
		const objects = { a: rect("a", { body: { text: "hi", fontSize: 20 } }) };
		expect(
			readSelectionTextStyle(makeState(["a"], objects), textStyleDefaults)
				.fontSize,
		).toEqual({ kind: "single", value: 20 });
	});

	it("two shapes agreeing → one value", () => {
		const objects = {
			a: rect("a", { body: { text: "hi", fontSize: 20 } }),
			b: rect("b", { body: { text: "yo", fontSize: 20 } }),
		};
		expect(
			readSelectionTextStyle(makeState(["a", "b"], objects), textStyleDefaults)
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
			textStyleDefaults,
		);
		expect(style.fontSize).toEqual({ kind: "mixed" });
		expect(style.textAlign).toEqual({ kind: "single", value: "center" });
	});

	it("a field neither slot sets → one value, and that value is undefined", () => {
		const objects = {
			a: rect("a", { body: { text: "hi" } }),
			b: rect("b", { body: { text: "yo" } }),
		};
		expect(
			readSelectionTextStyle(makeState(["a", "b"], objects), textStyleDefaults)
				.fontWeight,
		).toEqual({ kind: "single", value: undefined });
	});

	it("a field one slot sets and the other leaves unset → mixed", () => {
		const objects = {
			a: rect("a", { body: { text: "hi", fontWeight: "bold" } }),
			b: rect("b", { body: { text: "yo" } }),
		};
		expect(
			readSelectionTextStyle(makeState(["a", "b"], objects), textStyleDefaults)
				.fontWeight,
		).toEqual({ kind: "mixed" });
	});

	it("a size stated outright and the same size coming from the type's defaults → one value", () => {
		const defaults = createObjectTextStyleDefaultsRegistry();
		defaults.register("plain", { body: { fontSize: 14 } });
		const objects = {
			stated: rect("stated", { body: { text: "hi", fontSize: 14 } }),
			// Writes nothing, so its type's default is what it draws
			defaulted: rect("defaulted", { body: { text: "yo" } }, "plain"),
		};
		expect(
			readSelectionTextStyle(
				makeState(["stated", "defaulted"], objects),
				defaults,
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
			readSelectionTextStyle(makeState(["g"], objects), textStyleDefaults)
				.fontSize,
		).toEqual({ kind: "mixed" });
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
				makeState(["a"], objects, { objectId: "a", slotId: "rows" }),
				textStyleDefaults,
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
			readSelectionTextStyle(makeState(["a"], objects), textStyleDefaults)
				.fontSize,
		).toEqual({ kind: "single", value: 20 });
	});
});
