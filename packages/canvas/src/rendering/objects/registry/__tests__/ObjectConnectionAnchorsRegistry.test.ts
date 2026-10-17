import type { Dimensions } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { createObjectConnectionAnchorsRegistry } from "../ObjectConnectionAnchorsRegistry";

const tableAnchors = {
	topCenter: { offset: 24 },
	leftCenter: { offset: 24 },
};

/** A frame-shaped state with the fields a declaration's function form may read. */
const tableState = {
	id: "t1",
	type: "table",
	width: 240,
	height: 80,
} as unknown as ObjectState & Dimensions;

describe("ObjectConnectionAnchorsRegistry", () => {
	it("keeps the declaration per registered type", () => {
		const registry = createObjectConnectionAnchorsRegistry();
		const calculator = () => tableAnchors;
		registry.register("table", calculator);

		expect(registry.get("table")).toBe(calculator);
		expect(registry.get("rect")).toBeUndefined();
	});

	it("resolves a static declaration as it is", () => {
		const registry = createObjectConnectionAnchorsRegistry();
		registry.register("table", tableAnchors);

		expect(registry.resolve(tableState, 1)).toBe(tableAnchors);
	});

	it("resolves a function declaration by asking it for the object", () => {
		const registry = createObjectConnectionAnchorsRegistry();
		registry.register("table", (state) => ({
			topCenter: { offset: state.width / 10 },
		}));

		expect(registry.resolve(tableState, 1)).toEqual({
			topCenter: { offset: 24 },
		});
	});

	it("hands the zoom to a function declaration", () => {
		const registry = createObjectConnectionAnchorsRegistry();
		registry.register("table", (_state, zoom) => ({
			topCenter: { offset: 18 * zoom },
		}));

		expect(registry.resolve(tableState, 2.5)).toEqual({
			topCenter: { offset: 45 },
		});
	});

	it("resolves hidden anchors, static or per object", () => {
		const registry = createObjectConnectionAnchorsRegistry();
		const hiddenAnchors = {
			topCenter: { hidden: true },
			bottomCenter: { hidden: true },
		};
		registry.register("table", hiddenAnchors);
		registry.register("note", (state) => ({
			leftCenter: { hidden: state.width < 100 },
		}));

		expect(registry.resolve(tableState, 1)).toBe(hiddenAnchors);
		expect(
			registry.resolve({ ...tableState, type: "note", width: 80 }, 1),
		).toEqual({ leftCenter: { hidden: true } });
		expect(
			registry.resolve({ ...tableState, type: "note", width: 120 }, 1),
		).toEqual({ leftCenter: { hidden: false } });
	});

	it("resolves to undefined for a type that declared nothing", () => {
		const registry = createObjectConnectionAnchorsRegistry();

		expect(registry.resolve(tableState, 1)).toBeUndefined();
	});

	it("lets a later registration replace the earlier one", () => {
		const registry = createObjectConnectionAnchorsRegistry();
		const replacement = () => ({ topCenter: { offset: 30 } });
		registry.register("table", () => tableAnchors);
		registry.register("table", replacement);

		expect(registry.get("table")).toBe(replacement);
	});

	it("clear removes all registrations", () => {
		const registry = createObjectConnectionAnchorsRegistry();
		registry.register("table", () => tableAnchors);
		registry.clear();

		expect(registry.get("table")).toBeUndefined();
	});
});
