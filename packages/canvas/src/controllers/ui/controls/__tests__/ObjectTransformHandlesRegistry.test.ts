import { describe, expect, it } from "vitest";

import {
	ObjectTransformHandlesRegistry,
	resolveTransformHandles,
} from "../ObjectTransformHandlesRegistry";

/** Stand-in for a type whose size follows its own content (the frameless text shape). */
const textHandles = { resize: false };

describe("ObjectTransformHandlesRegistry", () => {
	it("keeps the declaration per registered type", () => {
		const registry = new ObjectTransformHandlesRegistry();
		registry.register("text", textHandles);

		expect(registry.get("text")).toBe(textHandles);
		expect(registry.get("rect")).toBeUndefined();
	});

	it("clear removes all registrations", () => {
		const registry = new ObjectTransformHandlesRegistry();
		registry.register("text", textHandles);
		registry.clear();
		expect(registry.get("text")).toBeUndefined();
	});
});

describe("resolveTransformHandles", () => {
	it("draws every handle for a type with no declaration", () => {
		expect(resolveTransformHandles()).toEqual({ resize: true, rotate: true });
		expect(resolveTransformHandles(undefined)).toEqual({
			resize: true,
			rotate: true,
		});
	});

	it("draws every handle for an empty declaration", () => {
		expect(resolveTransformHandles({})).toEqual({ resize: true, rotate: true });
	});

	it("fills in only the omitted flag", () => {
		expect(resolveTransformHandles(textHandles)).toEqual({
			resize: false,
			rotate: true,
		});
		expect(resolveTransformHandles({ rotate: false })).toEqual({
			resize: true,
			rotate: false,
		});
	});

	it("reports both off, which leaves the frame nothing to draw", () => {
		expect(resolveTransformHandles({ resize: false, rotate: false })).toEqual({
			resize: false,
			rotate: false,
		});
	});
});
