import { describe, it, expect } from "vitest";

import type { TextSlots } from "../../../../states/objects/types/TextSlots";
import {
	connectorOf,
	editingStateOf,
	ellipseOf,
	featuresWithText,
	groupOf,
	rectOf,
	registriesOf,
	sourceRectOf,
	stateOf,
	textRectOf,
} from "../../__tests__/support/styleFixtures";
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

	it("an intent this type has no entry for → the same state", () => {
		// A box's region is its whole box, so the two vertical bases name one
		// place and its table leaves the intent out.
		const a = rectOf("a");
		const state = stateOf(["a"], { a });
		expect(
			applyStyleIntent(
				state,
				{ kind: "textVerticalBasis", basis: "frame" },
				registries,
			),
		).toBe(state);
	});

	it("an intent that does not descend reaches the selected objects alone", () => {
		// The lock belongs to the box a drag acts on, so a member of a selected
		// group keeps the one it was drawn with (lockAspectRatioEntry).
		const g = groupOf("g", ["a"]);
		const a = rectOf("a");
		const result = applyStyleIntent(
			stateOf(["g"], { g, a }),
			{ kind: "lockAspectRatio", locked: true },
			registries,
		);
		expect(
			(result.objects["g"] as unknown as { lockAspectRatio?: boolean })
				.lockAspectRatio,
		).toBe(true);
		expect(result.objects["a"]).toBe(a);
	});

	it("the text content reaches the descendants of a selected group", () => {
		const g = groupOf("g", ["a"]);
		const a = textRectOf("a", { body: { text: "hello" } });
		const result = applyStyleIntent(
			stateOf(["g"], { g, a }),
			{ kind: "textContent", text: "world" },
			registries,
		);
		expect(
			(result.objects["a"] as unknown as { text: TextSlots }).text.body,
		).toEqual({ text: "world" });
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

	it("a size lands on the selected characters alone", () => {
		const a = textRectOf("a", { body: { text: "hello", fontSize: 12 } });
		const result = applyStyleIntent(
			editingStateOf({ a }, "a", "hello", { start: 0, end: 2 }),
			{ kind: "fontSize", size: 24 },
			registries,
		);
		expect(slotsOf(result.objects["a"]).body).toEqual({
			text: [{ text: "he", fontSize: 24 }, { text: "llo" }],
			fontSize: 12,
		});
	});

	it("an alignment lands on the whole slot even with a stretch selected", () => {
		// It places the whole block, so there is nothing smaller to apply it to.
		const a = textRectOf("a", { body: { text: "hello" } });
		const result = applyStyleIntent(
			editingStateOf({ a }, "a", "hello", { start: 0, end: 2 }),
			{ kind: "textAlign", align: "right" },
			registries,
		);
		expect(slotsOf(result.objects["a"]).body).toEqual({
			text: "hello",
			textAlign: "right",
		});
	});
});

describe("applyStyleIntent for a format keystroke", () => {
	const slotsOf = (object: unknown): TextSlots =>
		(object as { text: TextSlots }).text;

	const toggleBold = (state: Parameters<typeof applyStyleIntent>[0]) =>
		applyStyleIntent(state, { kind: "toggleBold" }, registries);

	it("styles the stretch the editor has selected and hands the draft back", () => {
		const a = textRectOf("a", { body: { text: "hello" } });
		const result = toggleBold(
			editingStateOf({ a }, "a", "hello", { start: 0, end: 2 }),
		);
		expect(slotsOf(result.objects["a"]).body.text).toEqual([
			{ text: "he", fontWeight: "bold" },
			{ text: "llo" },
		]);
		// The draft carries the styling too, or the next keystroke would write the
		// unstyled body back over the slot.
		expect(result.textEditState).toMatchObject({
			text: [{ text: "he", fontWeight: "bold" }, { text: "llo" }],
		});
	});

	it("styles the edited text, not the last committed one", () => {
		const a = textRectOf("a", { body: { text: "hi" } });
		const result = toggleBold(
			editingStateOf({ a }, "a", "hi there", { start: 3, end: 8 }),
		);
		expect(slotsOf(result.objects["a"]).body.text).toEqual([
			{ text: "hi " },
			{ text: "there", fontWeight: "bold" },
		]);
	});

	it("nothing selected in the editor → the same state", () => {
		const a = textRectOf("a", { body: { text: "hello" } });
		const collapsed = editingStateOf({ a }, "a", "hello", {
			start: 2,
			end: 2,
		});
		expect(toggleBold(collapsed)).toBe(collapsed);
		const unreported = editingStateOf({ a }, "a", "hello");
		expect(toggleBold(unreported)).toBe(unreported);
	});

	it("no editor open → the same state, a keystroke being no shape-wide write", () => {
		const a = textRectOf("a", { body: { text: "hello" } });
		const state = stateOf(["a"], { a });
		expect(toggleBold(state)).toBe(state);
	});

	it("a source-language body → the same state, its own syntax carrying the emphasis", () => {
		const a = sourceRectOf("a", { body: { text: "# Title" } });
		const state = editingStateOf({ a }, "a", "# Title", { start: 0, end: 2 });
		expect(toggleBold(state)).toBe(state);
	});
});
