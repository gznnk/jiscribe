import { describe, it, expect } from "vitest";

import { applyStyleIntent } from "../applyStyleIntent";
import {
	connectorOf,
	ellipseOf,
	groupOf,
	rectOf,
	registriesOf,
	stateOf,
} from "./support/styleFixtures";

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
