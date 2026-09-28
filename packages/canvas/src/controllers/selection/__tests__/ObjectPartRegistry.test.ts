import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ObjectPartDefinition } from "../ObjectPartRegistry";
import { createObjectPartRegistry } from "../ObjectPartRegistry";

const partOf = (kind: string): ObjectPartDefinition => ({
	kind,
	has: () => true,
});

describe("ObjectPartRegistry", () => {
	it("hands back the definition registered for a type and kind", () => {
		const registry = createObjectPartRegistry();
		const vertex = partOf("vertex");

		registry.register("polyline", [vertex]);

		expect(registry.get("polyline", "vertex")).toBe(vertex);
	});

	it("answers undefined for a type or a kind nobody registered", () => {
		const registry = createObjectPartRegistry();
		registry.register("polyline", [partOf("vertex")]);

		expect(registry.get("polyline", "textSlot")).toBeUndefined();
		expect(registry.get("rect", "vertex")).toBeUndefined();
	});

	it("keeps every kind a type declares apart", () => {
		const registry = createObjectPartRegistry();
		const vertex = partOf("vertex");
		const slot = partOf("textSlot");

		registry.register("polyline", [vertex, slot]);

		expect(registry.get("polyline", "vertex")).toBe(vertex);
		expect(registry.get("polyline", "textSlot")).toBe(slot);
	});

	it("throws on a repeated kind rather than letting the second shadow the first", () => {
		const registry = createObjectPartRegistry();

		expect(() =>
			registry.register("polyline", [partOf("vertex"), partOf("vertex")]),
		).toThrow(/vertex/);
	});

	// Registration is per type rather than additive, the way a definition is
	// applied whole (applyObjectDefinition).
	it("replaces everything a type had registered before", () => {
		const registry = createObjectPartRegistry();
		registry.register("polyline", [partOf("vertex")]);

		registry.register("polyline", [partOf("textSlot")]);

		expect(registry.get("polyline", "vertex")).toBeUndefined();
		expect(registry.get("polyline", "textSlot")).toBeDefined();
	});

	it("forgets every type on clear", () => {
		const registry = createObjectPartRegistry();
		registry.register("polyline", [partOf("vertex")]);

		registry.clear();

		expect(registry.get("polyline", "vertex")).toBeUndefined();
	});

	it("takes a definition narrowed to the type's own state", () => {
		type PointyState = ObjectState & { points: { x: number; y: number }[] };
		const registry = createObjectPartRegistry();
		const pointy: ObjectPartDefinition<PointyState> = {
			kind: "vertex",
			has: (object, partId) => Number(partId) < object.points.length,
		};

		registry.register<PointyState>("polyline", [pointy]);

		expect(registry.get("polyline", "vertex")).toBe(pointy);
	});
});
