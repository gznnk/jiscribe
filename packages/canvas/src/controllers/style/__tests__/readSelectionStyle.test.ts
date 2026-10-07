import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import { createObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import { CONNECTOR_STYLE } from "../connectorStyle";
import { readSelectionStyle } from "../readSelectionStyle";
import type { SelectionValue } from "../SelectionValue";
import {
	connectorOf,
	editingStateOf,
	ellipseOf,
	featuresWithText,
	groupOf,
	rectOf,
	registriesOf,
	slotPickOf,
	stateOf,
	textRectOf,
} from "./support/styleFixtures";

const registries = registriesOf();

describe("readSelectionStyle", () => {
	it("nothing selected → none", () => {
		expect(readSelectionStyle(stateOf([], {}), "fill", registries)).toEqual({
			kind: "none",
		});
	});

	it("nothing the selection reaches takes the intent → none", () => {
		const c = connectorOf("c");
		expect(
			readSelectionStyle(stateOf(["c"], { c }), "fill", registries),
		).toEqual({
			kind: "none",
		});
	});

	it("one object → its own value", () => {
		const a = rectOf("a", { fill: "#f00" });
		expect(
			readSelectionStyle(stateOf(["a"], { a }), "fill", registries),
		).toEqual({
			kind: "single",
			value: "#f00",
		});
	});

	it("two objects agreeing → one value", () => {
		const a = rectOf("a", { fill: "#f00" });
		const b = ellipseOf("b", { fill: "#f00" });
		expect(
			readSelectionStyle(stateOf(["a", "b"], { a, b }), "fill", registries),
		).toEqual({ kind: "single", value: "#f00" });
	});

	it("two objects disagreeing → mixed, in selection order", () => {
		const a = rectOf("a", { fill: "#f00" });
		const b = ellipseOf("b", { fill: "#0f0" });
		expect(
			readSelectionStyle(stateOf(["a", "b"], { a, b }), "fill", registries),
		).toEqual({ kind: "mixed", values: ["#f00", "#0f0"] });
	});

	it("an object stating nothing → the shared last resort, not no value", () => {
		const a = rectOf("a");
		expect(
			readSelectionStyle(stateOf(["a"], { a }), "fill", registries),
		).toEqual({
			kind: "single",
			value: SHAPE_STYLE_FALLBACK.fill,
		});
	});

	it("a value stated outright and the same one coming from the type's defaults → one value", () => {
		const defaults = createObjectShapeStyleDefaultsRegistry();
		defaults.register("ellipse", { fill: "#fff" });
		const a = rectOf("a", { fill: "#fff" });
		// Writes nothing, so its type's default is what it draws
		const b = ellipseOf("b");
		expect(
			readSelectionStyle(
				stateOf(["a", "b"], { a, b }),
				"fill",
				registriesOf(defaults),
			),
		).toEqual({ kind: "single", value: "#fff" });
	});

	it("a field holding the wrong type reads as unset", () => {
		const a = rectOf("a", { fill: 7 });
		expect(
			readSelectionStyle(stateOf(["a"], { a }), "fill", registries),
		).toEqual({
			kind: "single",
			value: SHAPE_STYLE_FALLBACK.fill,
		});
	});

	it("the descendants of a selected group have their say", () => {
		const g = groupOf("g", ["a", "b"]);
		const a = rectOf("a", { fill: "#f00" });
		const b = ellipseOf("b", { fill: "#0f0" });
		expect(
			readSelectionStyle(stateOf(["g"], { g, a, b }), "fill", registries),
		).toEqual({ kind: "mixed", values: ["#f00", "#0f0"] });
	});

	it("an intent this type has no entry for → none", () => {
		// A box's region is its whole box, so the two vertical bases name one place
		// and its table leaves the intent out.
		const a = rectOf("a");
		expect(
			readSelectionStyle(
				stateOf(["a"], { a }),
				"textVerticalBasis",
				registries,
			),
		).toEqual({ kind: "none" });
	});

	it("an intent that does not descend reads the selected objects alone", () => {
		const g = groupOf("g", ["a"]);
		const a = rectOf("a", { lockAspectRatio: true });
		// The group carries no lock of its own, so its own reading is what answers
		// (lockAspectRatioEntry).
		expect(
			readSelectionStyle(
				stateOf(["g"], { g, a }),
				"lockAspectRatio",
				registries,
			),
		).toEqual({ kind: "single", value: false });
	});
});

describe("readSelectionStyle on the radius and the arrowheads", () => {
	it("a shape declaring the radius → its own value", () => {
		const a = rectOf("a", { rx: 8 });
		expect(
			readSelectionStyle(stateOf(["a"], { a }), "cornerRadius", registries),
		).toEqual({ kind: "single", value: 8 });
	});

	it("a shape rounding nothing → square corners, not no value", () => {
		const a = rectOf("a");
		expect(
			readSelectionStyle(stateOf(["a"], { a }), "cornerRadius", registries),
		).toEqual({ kind: "single", value: SHAPE_STYLE_FALLBACK.rx });
	});

	it("a type with no corners to round has no say", () => {
		// An ellipse's own `rx` is geometry, which is why it declares no radius.
		const a = ellipseOf("a", { rx: 32 });
		expect(
			readSelectionStyle(stateOf(["a"], { a }), "cornerRadius", registries),
		).toEqual({ kind: "none" });
	});

	it("an end nobody set reads as the bare mark", () => {
		const c = connectorOf("c");
		expect(
			readSelectionStyle(stateOf(["c"], { c }), "endArrow", registries),
		).toEqual({ kind: "single", value: SHAPE_STYLE_FALLBACK.endArrow });
	});

	it("the two ends are told apart", () => {
		const c = connectorOf("c", { endArrow: "FilledTriangle" });
		const state = stateOf(["c"], { c });
		expect(readSelectionStyle(state, "endArrow", registries)).toEqual({
			kind: "single",
			value: "FilledTriangle",
		});
		expect(readSelectionStyle(state, "startArrow", registries)).toEqual({
			kind: "single",
			value: SHAPE_STYLE_FALLBACK.startArrow,
		});
	});

	it("a mark outside the vocabulary reads as unset", () => {
		const c = connectorOf("c", { endArrow: "Arrow" });
		expect(
			readSelectionStyle(stateOf(["c"], { c }), "endArrow", registries),
		).toEqual({ kind: "single", value: SHAPE_STYLE_FALLBACK.endArrow });
	});

	it("a shape with no ends has no say", () => {
		const a = rectOf("a");
		expect(
			readSelectionStyle(stateOf(["a"], { a }), "endArrow", registries),
		).toEqual({ kind: "none" });
	});
});

describe("readSelectionStyle on a text style", () => {
	const readColor = (state: Parameters<typeof readSelectionStyle>[0]) =>
		readSelectionStyle(state, "fontColor", registries);

	it("nothing selected holds text → none", () => {
		const a = rectOf("a", { fill: "#f00" });
		expect(readColor(stateOf(["a"], { a }))).toEqual({ kind: "none" });
	});

	it("one shape → its slot's value", () => {
		const a = textRectOf("a", { body: { text: "hi", fontColor: "#f00" } });
		expect(readColor(stateOf(["a"], { a }))).toEqual({
			kind: "single",
			value: "#f00",
		});
	});

	it("every slot of a multi-slot shape has a say, the write reaching them all", () => {
		const a = textRectOf("a", {
			name: { text: "User", fontColor: "#f00" },
			rows: { text: ["id"], fontColor: "#0f0" },
		});
		expect(readColor(stateOf(["a"], { a }))).toEqual({
			kind: "mixed",
			values: ["#f00", "#0f0"],
		});
	});

	it("a picked slot narrows it to that slot", () => {
		const a = textRectOf("a", {
			name: { text: "User", fontColor: "#f00" },
			rows: { text: ["id"], fontColor: "#0f0" },
		});
		expect(readColor(stateOf(["a"], { a }, slotPickOf("rows")))).toEqual({
			kind: "single",
			value: "#0f0",
		});
	});

	it("the descendants of a selected group have their say", () => {
		const g = groupOf("g", ["a", "b"]);
		const a = textRectOf("a", { body: { text: "hi", fontColor: "#f00" } });
		const b = textRectOf("b", { body: { text: "yo", fontColor: "#0f0" } });
		expect(readColor(stateOf(["g"], { g, a, b }))).toEqual({
			kind: "mixed",
			values: ["#f00", "#0f0"],
		});
	});

	it("a stretch of the open editor's text → what that stretch is drawn with", () => {
		const a = textRectOf("a", { body: { text: "hello" } });
		// The draft the editor holds is what the offsets address.
		const state = editingStateOf(
			{ a },
			"a",
			[{ text: "he", fontColor: "#f00" }, { text: "llo!" }],
			{ start: 0, end: 2 },
		);
		expect(readColor(state)).toEqual({ kind: "single", value: "#f00" });
	});

	it("a stretch the color is not uniform in → mixed, one value per run", () => {
		const a = textRectOf("a", { body: { text: "hello", fontColor: "#111" } });
		const state = editingStateOf(
			{ a },
			"a",
			[{ text: "he", fontColor: "#f00" }, { text: "llo" }],
			{ start: 0, end: 5 },
		);
		expect(readColor(state)).toEqual({
			kind: "mixed",
			values: ["#f00", "#111"],
		});
	});

	it("a source-language body reads the whole slot, which the write also lands on", () => {
		const a = textRectOf(
			"a",
			{ body: { text: "# Title", fontColor: "#f00" } },
			{ features: featuresWithText("source") },
		);
		const state = editingStateOf({ a }, "a", "# Title", { start: 0, end: 2 });
		expect(readColor(state)).toEqual({ kind: "single", value: "#f00" });
	});

	describe("through a table a type declared", () => {
		it("reads the declared kind, typed from the declaration", () => {
			const c = connectorOf("c", { label: { text: "Yes", fill: "#f00" } });
			const fill: SelectionValue<string | undefined> = readSelectionStyle(
				stateOf(["c"], { c }),
				CONNECTOR_STYLE,
				"label.fill",
				registries,
			);
			expect(fill).toEqual({ kind: "single", value: "#f00" });
		});

		it("reads unset as the value it is, a label being there to write to", () => {
			const c = connectorOf("c", { label: { text: "Yes" } });
			expect(
				readSelectionStyle(
					stateOf(["c"], { c }),
					CONNECTOR_STYLE,
					"label.fill",
					registries,
				),
			).toEqual({ kind: "single", value: undefined });
		});

		it("a type that declared nothing of the kind → none", () => {
			const a = rectOf("a");
			expect(
				readSelectionStyle(
					stateOf(["a"], { a }),
					CONNECTOR_STYLE,
					"label.fill",
					registries,
				),
			).toEqual({ kind: "none" });
		});
	});
});
