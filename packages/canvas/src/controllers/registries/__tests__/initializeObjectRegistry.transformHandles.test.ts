import { describe, expect, it } from "vitest";

import { defineObject } from "../../../plugin/ObjectTypeDefinition";
import type { ObjectTypeDefinition } from "../../../plugin/ObjectTypeDefinition";
import { createTestRegistries } from "../createCanvasRegistries";
import { applyObjectDefinition } from "../initializeObjectRegistry";

// Minimal stand-in for an object type, mirroring buildFakeDefinition in
// createCanvasRegistries.test.ts.
const buildFakeDefinition = (type: string): ObjectTypeDefinition =>
	defineObject({
		features: { type, geometry: "rect" },
		validateDoc: () => [],
		mapper: {
			toDoc: (state) => ({ id: state.id, type }),
			toState: (doc) => ({ id: doc.id, type }),
		},
		stateValidator: () => true,
		component: () => null,
		behavior: {
			moveByDelta: (state) => state,
			transformByGroup: (state) => state,
			rotateByGroup: (state) => state,
		},
		menu: [],
	});

describe("applyObjectDefinition: transformHandles", () => {
	it("registers the declaration for the type declaring it", () => {
		const registries = createTestRegistries();
		const handles = { resize: false };
		applyObjectDefinition(
			registries,
			"note",
			defineObject({
				...buildFakeDefinition("note"),
				transformHandles: handles,
			}),
		);

		// The registry must hold the definition's own object: TransformControls is
		// memoized on it, so a copy would re-render the frame every time.
		expect(registries.objectTransformHandles.get("note")).toBe(handles);
	});

	it("leaves types that declare nothing unregistered", () => {
		const registries = createTestRegistries();
		applyObjectDefinition(registries, "plain", buildFakeDefinition("plain"));

		expect(registries.objectTransformHandles.get("plain")).toBeUndefined();
		// Every built-in stays on the default (all handles) too.
		for (const type of ["rect", "ellipse", "polygon", "polyline", "svg"]) {
			expect(registries.objectTransformHandles.get(type)).toBeUndefined();
		}
	});
});
