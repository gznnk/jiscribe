import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import { createObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import { readStyleIntent } from "../readStyleIntent";
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

describe("readStyleIntent", () => {
	it("nothing selected → none", () => {
		expect(readStyleIntent(stateOf([], {}), "fill", registries)).toEqual({
			kind: "none",
		});
	});

	it("nothing the selection reaches takes the intent → none", () => {
		const c = connectorOf("c");
		expect(readStyleIntent(stateOf(["c"], { c }), "fill", registries)).toEqual({
			kind: "none",
		});
	});

	it("one object → its own value", () => {
		const a = rectOf("a", { fill: "#f00" });
		expect(readStyleIntent(stateOf(["a"], { a }), "fill", registries)).toEqual({
			kind: "single",
			value: "#f00",
		});
	});

	it("two objects agreeing → one value", () => {
		const a = rectOf("a", { fill: "#f00" });
		const b = ellipseOf("b", { fill: "#f00" });
		expect(
			readStyleIntent(stateOf(["a", "b"], { a, b }), "fill", registries),
		).toEqual({ kind: "single", value: "#f00" });
	});

	it("two objects disagreeing → mixed, in selection order", () => {
		const a = rectOf("a", { fill: "#f00" });
		const b = ellipseOf("b", { fill: "#0f0" });
		expect(
			readStyleIntent(stateOf(["a", "b"], { a, b }), "fill", registries),
		).toEqual({ kind: "mixed", values: ["#f00", "#0f0"] });
	});

	it("an object stating nothing → the shared last resort, not no value", () => {
		const a = rectOf("a");
		expect(readStyleIntent(stateOf(["a"], { a }), "fill", registries)).toEqual({
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
			readStyleIntent(
				stateOf(["a", "b"], { a, b }),
				"fill",
				registriesOf(defaults),
			),
		).toEqual({ kind: "single", value: "#fff" });
	});

	it("a field holding the wrong type reads as unset", () => {
		const a = rectOf("a", { fill: 7 });
		expect(readStyleIntent(stateOf(["a"], { a }), "fill", registries)).toEqual({
			kind: "single",
			value: SHAPE_STYLE_FALLBACK.fill,
		});
	});

	it("the descendants of a selected group have their say", () => {
		const g = groupOf("g", ["a", "b"]);
		const a = rectOf("a", { fill: "#f00" });
		const b = ellipseOf("b", { fill: "#0f0" });
		expect(
			readStyleIntent(stateOf(["g"], { g, a, b }), "fill", registries),
		).toEqual({ kind: "mixed", values: ["#f00", "#0f0"] });
	});

	it("an intent no type has an entry for → none", () => {
		const a = rectOf("a", { stroke: "#f00" });
		expect(
			readStyleIntent(stateOf(["a"], { a }), "stroke", registries),
		).toEqual({ kind: "none" });
	});
});

describe("readStyleIntent on a text style", () => {
	const readColor = (state: Parameters<typeof readStyleIntent>[0]) =>
		readStyleIntent(state, "fontColor", registries);

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
});
