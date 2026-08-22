import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import {
	ObjectTransformHandlesRegistry,
	resolveTransformHandles,
} from "../ObjectTransformHandlesRegistry";

/** Stand-in for a type whose size follows its own content (the frameless text shape). */
const textHandles = { resize: false };

/** Stand-in for the same type wrapping in a width of its own. */
const blockHandles = { resize: "width" } as const;

const objectOf = (fields: Record<string, unknown>): ObjectState =>
	({ id: "o", type: "text", ...fields }) as unknown as ObjectState;

describe("ObjectTransformHandlesRegistry", () => {
	it("keeps the declaration per registered type", () => {
		const registry = new ObjectTransformHandlesRegistry();
		registry.register("text", textHandles);

		expect(registry.get("text")).toBe(textHandles);
		expect(registry.get("rect")).toBeUndefined();
	});

	it("asks a per-object declaration about the object at hand", () => {
		const registry = new ObjectTransformHandlesRegistry();
		registry.register("text", (state) =>
			(state as { textLayout?: string }).textLayout === "block"
				? blockHandles
				: textHandles,
		);

		expect(registry.resolve(objectOf({ textLayout: "block" }))).toBe(
			blockHandles,
		);
		expect(registry.resolve(objectOf({}))).toBe(textHandles);
	});

	it("resolves a fixed declaration to itself, and an unregistered type to nothing", () => {
		const registry = new ObjectTransformHandlesRegistry();
		registry.register("text", textHandles);

		expect(registry.resolve(objectOf({}))).toBe(textHandles);
		expect(registry.resolve(objectOf({ type: "rect" }))).toBeUndefined();
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

	it("carries the width-only answer through untouched", () => {
		expect(resolveTransformHandles(blockHandles)).toEqual({
			resize: "width",
			rotate: true,
		});
	});

	it("reports both off, which leaves the frame nothing to draw", () => {
		expect(resolveTransformHandles({ resize: false, rotate: false })).toEqual({
			resize: false,
			rotate: false,
		});
	});
});
