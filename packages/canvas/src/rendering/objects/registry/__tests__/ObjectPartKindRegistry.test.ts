import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ObjectPartKindDefinition } from "../ObjectPartKindRegistry";
import { createObjectPartKindRegistry } from "../ObjectPartKindRegistry";

const partOf = (kind: string): ObjectPartKindDefinition => ({
	kind,
	has: () => true,
});

describe("ObjectPartKindRegistry", () => {
	it("hands back the definition registered for a type and kind", () => {
		const registry = createObjectPartKindRegistry();
		const vertex = partOf("vertex");

		registry.register("polyline", [vertex]);

		expect(registry.get("polyline", "vertex")).toBe(vertex);
	});

	it("answers undefined for a type or a kind nobody registered", () => {
		const registry = createObjectPartKindRegistry();
		registry.register("polyline", [partOf("vertex")]);

		expect(registry.get("polyline", "textSlot")).toBeUndefined();
		expect(registry.get("rect", "vertex")).toBeUndefined();
	});

	it("keeps every kind a type declares apart", () => {
		const registry = createObjectPartKindRegistry();
		const vertex = partOf("vertex");
		const slot = partOf("textSlot");

		registry.register("polyline", [vertex, slot]);

		expect(registry.get("polyline", "vertex")).toBe(vertex);
		expect(registry.get("polyline", "textSlot")).toBe(slot);
	});

	it("throws on a repeated kind rather than letting the second shadow the first", () => {
		const registry = createObjectPartKindRegistry();

		expect(() =>
			registry.register("polyline", [partOf("vertex"), partOf("vertex")]),
		).toThrow(/vertex/);
	});

	it("takes a kind spelled as an identifier", () => {
		const registry = createObjectPartKindRegistry();

		expect(() =>
			registry.register("table", [
				partOf("textSlot"),
				partOf("vertex"),
				partOf("cell_2"),
				partOf("table-cell"),
			]),
		).not.toThrow();
	});

	it("throws on a kind that is no identifier", () => {
		const registry = createObjectPartKindRegistry();

		// Holding the separator of a part address would make the split ambiguous.
		expect(() => registry.register("table", [partOf("cell:row")])).toThrow(
			/cell:row/,
		);
		expect(() => registry.register("table", [partOf("")])).toThrow(
			/identifier/,
		);
		expect(() => registry.register("table", [partOf("2cells")])).toThrow(
			/2cells/,
		);
		expect(() => registry.register("table", [partOf("cell row")])).toThrow(
			/cell row/,
		);
	});

	// Registration is per type rather than additive, the way a definition is
	// applied whole (applyObjectDefinition).
	it("replaces everything a type had registered before", () => {
		const registry = createObjectPartKindRegistry();
		registry.register("polyline", [partOf("vertex")]);

		registry.register("polyline", [partOf("textSlot")]);

		expect(registry.get("polyline", "vertex")).toBeUndefined();
		expect(registry.get("polyline", "textSlot")).toBeDefined();
	});

	it("forgets every type on clear", () => {
		const registry = createObjectPartKindRegistry();
		registry.register("polyline", [partOf("vertex")]);

		registry.clear();

		expect(registry.get("polyline", "vertex")).toBeUndefined();
	});

	it("takes a definition narrowed to the type's own state", () => {
		type PointyState = ObjectState & { points: { x: number; y: number }[] };
		const registry = createObjectPartKindRegistry();
		const pointy: ObjectPartKindDefinition<PointyState> = {
			kind: "vertex",
			has: (object, partId) => Number(partId) < object.points.length,
		};

		registry.register<PointyState>("polyline", [pointy]);

		expect(registry.get("polyline", "vertex")).toBe(pointy);
	});
});
