import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import { createObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import { describe, it, expect } from "vitest";

import { readStyleIntent } from "../readStyleIntent";
import {
	connectorOf,
	ellipseOf,
	groupOf,
	rectOf,
	registriesOf,
	stateOf,
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
