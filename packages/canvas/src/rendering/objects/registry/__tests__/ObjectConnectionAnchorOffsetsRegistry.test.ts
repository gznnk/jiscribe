import type { Dimensions } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { createObjectConnectionAnchorOffsetsRegistry } from "../ObjectConnectionAnchorOffsetsRegistry";

const tableOffsets = { topCenter: 24, leftCenter: 24 };

/** A frame-shaped state with the fields a declaration's function form may read. */
const tableState = {
	id: "t1",
	type: "table",
	width: 240,
	height: 80,
} as unknown as ObjectState & Dimensions;

describe("ObjectConnectionAnchorOffsetsRegistry", () => {
	it("keeps the declaration per registered type", () => {
		const registry = createObjectConnectionAnchorOffsetsRegistry();
		const calculator = () => tableOffsets;
		registry.register("table", calculator);

		expect(registry.get("table")).toBe(calculator);
		expect(registry.get("rect")).toBeUndefined();
	});

	it("resolves a static declaration as it is", () => {
		const registry = createObjectConnectionAnchorOffsetsRegistry();
		registry.register("table", tableOffsets);

		expect(registry.resolve(tableState)).toBe(tableOffsets);
	});

	it("resolves a function declaration by asking it for the object", () => {
		const registry = createObjectConnectionAnchorOffsetsRegistry();
		registry.register("table", (state) => ({ topCenter: state.width / 10 }));

		expect(registry.resolve(tableState)).toEqual({ topCenter: 24 });
	});

	it("resolves to undefined for a type that declared nothing", () => {
		const registry = createObjectConnectionAnchorOffsetsRegistry();

		expect(registry.resolve(tableState)).toBeUndefined();
	});

	it("lets a later registration replace the earlier one", () => {
		const registry = createObjectConnectionAnchorOffsetsRegistry();
		const replacement = () => ({ topCenter: 30 });
		registry.register("table", () => tableOffsets);
		registry.register("table", replacement);

		expect(registry.get("table")).toBe(replacement);
	});

	it("clear removes all registrations", () => {
		const registry = createObjectConnectionAnchorOffsetsRegistry();
		registry.register("table", () => tableOffsets);
		registry.clear();

		expect(registry.get("table")).toBeUndefined();
	});
});
