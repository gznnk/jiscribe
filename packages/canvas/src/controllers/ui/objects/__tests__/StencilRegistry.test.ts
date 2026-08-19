import { describe, it, expect } from "vitest";

import type { Stencil } from "../Stencil";
import { createStencilRegistry } from "../StencilRegistry";

const DummyIcon = () => null;

const preset = (id: string): Stencil => ({
	id,
	objectType: "rect",
	label: id,
	icon: DummyIcon,
});

describe("StencilRegistry", () => {
	it("returns presets from all in registration order", () => {
		const registry = createStencilRegistry();
		registry.register(preset("b"));
		registry.register(preset("a"));
		registry.register(preset("c"));

		expect(registry.all().map((p) => p.id)).toEqual(["b", "a", "c"]);
	});

	it("refuses an id carrying the separator its own data-part uses", () => {
		const registry = createStencilRegistry();

		// Registered, it would render a palette entry that clicks into nothing: the click
		// handler reads the id back out of `item:{id}` and would stop at the first colon.
		expect(() => registry.register(preset("lucideIcon:user"))).toThrow(/colon/);
		expect(registry.all()).toHaveLength(0);
	});

	it("looks a preset up by id with get, returning undefined when unregistered", () => {
		const registry = createStencilRegistry();
		registry.register(preset("rect"));

		expect(registry.get("rect")?.id).toBe("rect");
		expect(registry.get("missing")).toBeUndefined();
	});

	it("discards every registration on clear", () => {
		const registry = createStencilRegistry();
		registry.register(preset("rect"));
		registry.clear();

		expect(registry.all()).toEqual([]);
		expect(registry.get("rect")).toBeUndefined();
	});
});
