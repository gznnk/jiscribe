import { describe, it, expect } from "vitest";

import {
	connectorOf,
	editingStateOf,
	ellipseOf,
	featuresWithText,
	groupOf,
	rectOf,
	registriesOf,
	stateOf,
	textRectOf,
} from "./support/styleFixtures";
import type { TextSlots } from "../../../states/objects/types/TextSlots";
import { applyStyleIntent } from "../applyStyleIntent";

const registries = registriesOf();

const fillOf = (object: unknown): unknown =>
	(object as Record<string, unknown>).fill;

const paint = (state: Parameters<typeof applyStyleIntent>[0], color: string) =>
	applyStyleIntent(state, { kind: "fill", color }, registries);

describe("applyStyleIntent", () => {
	it("nothing selected → the same state", () => {
		const state = stateOf([], {});
		expect(paint(state, "#ff0000")).toBe(state);
	});

	it("one object → its field is written", () => {
		const a = rectOf("a", { fill: "#ffffff" });
		const result = paint(stateOf(["a"], { a }), "#ff0000");
		expect(fillOf(result.objects["a"])).toBe("#ff0000");
	});

	it("several objects → every one of them is written", () => {
		const a = rectOf("a", { fill: "#ffffff" });
		const b = ellipseOf("b", { fill: "#ffffff" });
		const result = paint(stateOf(["a", "b"], { a, b }), "#ff0000");
		expect(fillOf(result.objects["a"])).toBe("#ff0000");
		expect(fillOf(result.objects["b"])).toBe("#ff0000");
	});

	it("a selected group → its descendants are written too", () => {
		const g = groupOf("g", ["a", "inner"]);
		const a = rectOf("a", { fill: "#ffffff" });
		const inner = groupOf("inner", ["b"]);
		const b = ellipseOf("b", { fill: "#ffffff" });
		const result = paint(stateOf(["g"], { g, a, inner, b }), "#ff0000");
		expect(fillOf(result.objects["a"])).toBe("#ff0000");
		expect(fillOf(result.objects["b"])).toBe("#ff0000");
		// The groups themselves declare no fill, so they are passed by
		expect(result.objects["g"]).toBe(g);
		expect(result.objects["inner"]).toBe(inner);
	});

	it("a type taking no such intent (a connector has no fill) → the same state", () => {
		const c = connectorOf("c");
		const state = stateOf(["c"], { c });
		expect(paint(state, "#ff0000")).toBe(state);
	});

	it("a type taking the intent beside one that does not → only the first is written", () => {
		const g = groupOf("g", ["a", "c"]);
		const a = rectOf("a", { fill: "#ffffff" });
		const c = connectorOf("c");
		const result = paint(stateOf(["g"], { g, a, c }), "#ff0000");
		expect(fillOf(result.objects["a"])).toBe("#ff0000");
		expect(result.objects["c"]).toBe(c);
	});

	it("the value already there → the same state", () => {
		const a = rectOf("a", { fill: "#ff0000" });
		const state = stateOf(["a"], { a });
		expect(paint(state, "#ff0000")).toBe(state);
	});

	it("one of two already painted → the state changes, that object does not", () => {
		const a = rectOf("a", { fill: "#ff0000" });
		const b = ellipseOf("b", { fill: "#ffffff" });
		const result = paint(stateOf(["a", "b"], { a, b }), "#ff0000");
		expect(result.objects["a"]).toBe(a);
		expect(fillOf(result.objects["b"])).toBe("#ff0000");
	});

	it("an intent no type has an entry for → the same state", () => {
		const a = rectOf("a", { stroke: "#000000" });
		const state = stateOf(["a"], { a });
		expect(
			applyStyleIntent(state, { kind: "stroke", color: "#ff0000" }, registries),
		).toBe(state);
	});

	it("the objects it was given are left as they were", () => {
		const a = rectOf("a", { fill: "#ffffff" });
		paint(stateOf(["a"], { a }), "#ff0000");
		expect(fillOf(a)).toBe("#ffffff");
	});
});

describe("applyStyleIntent while a shape editor is open", () => {
	const slotsOf = (object: unknown): TextSlots =>
		(object as { text: TextSlots }).text;

	const colorText = (
		state: Parameters<typeof applyStyleIntent>[0],
		color: string,
	) => applyStyleIntent(state, { kind: "fontColor", color }, registries);

	it("the draft is written into the slot, so the stretch styled is the one on screen", () => {
		// "hello" committed, "hello!" typed: the offsets address the draft.
		const a = textRectOf("a", { body: { text: "hello" } });
		const result = colorText(
			editingStateOf({ a }, "a", "hello!", {
				start: 5,
				end: 6,
			}),
			"#d33",
		);
		expect(slotsOf(result.objects["a"]).body.text).toEqual([
			{ text: "hello" },
			{ text: "!", fontColor: "#d33" },
		]);
	});

	it("the styled slot is written back into the draft", () => {
		const a = textRectOf("a", { body: { text: "hello" } });
		const result = colorText(
			editingStateOf({ a }, "a", "hello", { start: 0, end: 2 }),
			"#d33",
		);
		expect(result.textEditState).toMatchObject({
			text: [{ text: "he", fontColor: "#d33" }, { text: "llo" }],
		});
	});

	it("a whole-slot write drops the property from the draft's runs too", () => {
		// Left in place, the next graft would write the overrides back over the
		// slot and the slot-wide value would never show.
		const a = textRectOf("a", {
			body: { text: [{ text: "he", fontColor: "#d33" }, { text: "llo" }] },
		});
		const state = editingStateOf(
			{ a },
			"a",
			[{ text: "he", fontColor: "#d33", fontWeight: "bold" }, { text: "llo!" }],
			{ start: 2, end: 2 },
		);
		const result = colorText(state, "#00f");
		// The slot takes the draft on the way, so it holds the typed characters and
		// the run styling the write did not strip.
		expect(slotsOf(result.objects["a"]).body).toEqual({
			text: [{ text: "he", fontWeight: "bold" }, { text: "llo!" }],
			fontColor: "#00f",
		});
		// The written property leaves the draft's runs; the rest of their styling
		// and the edited characters stay.
		expect(result.textEditState).toMatchObject({
			text: [{ text: "he", fontWeight: "bold" }, { text: "llo!" }],
		});
	});

	it("a source-language body takes the whole-slot write even with a stretch selected", () => {
		const a = textRectOf(
			"a",
			{ body: { text: "# Title" } },
			{ features: featuresWithText("source") },
		);
		const result = colorText(
			editingStateOf({ a }, "a", "# Title", { start: 0, end: 2 }),
			"#d33",
		);
		expect(slotsOf(result.objects["a"]).body).toEqual({
			text: "# Title",
			fontColor: "#d33",
		});
	});

	it("an intent that lands elsewhere on the edited object → the slot keeps its committed text", () => {
		// Painting the face mid-typing is not a text edit: the draft stays the
		// editor's until it commits, and the fill alone changes.
		const a = textRectOf("a", { body: { text: "hello" } }, { fill: "#f00" });
		const state = editingStateOf({ a }, "a", "hello!");
		const result = paint(state, "#0f0");
		expect(fillOf(result.objects["a"])).toBe("#0f0");
		expect(slotsOf(result.objects["a"])).toBe(slotsOf(a));
		expect(result.textEditState).toBe(state.textEditState);
	});

	it("an intent the edited object does not take → the draft is dropped with the rest", () => {
		// The fill is already there, so the fill entry answers with the object it
		// was handed — graft included, which is then discarded.
		const a = textRectOf("a", { body: { text: "hello" } }, { fill: "#f00" });
		const state = editingStateOf({ a }, "a", "hello!");
		expect(paint(state, "#f00")).toBe(state);
	});
});
