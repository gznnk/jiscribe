import { describe, expect, it } from "vitest";

import { defineObject } from "../../../plugin/ObjectTypeDefinition";
import type { ObjectTypeDefinition } from "../../../plugin/ObjectTypeDefinition";
import { applyObjectDefinition } from "../applyObjectDefinition";
import { createTestRegistries } from "../createCanvasRegistries";

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

describe("applyObjectDefinition: labelBackdrop", () => {
	it("registers the calculator for the type declaring it", () => {
		const registries = createTestRegistries();
		const labelBackdrop = () => [];
		applyObjectDefinition(
			registries,
			"frame",
			defineObject({ ...buildFakeDefinition("frame"), labelBackdrop }),
		);

		expect(registries.objectLabelBackdrop.get("frame")).toBe(labelBackdrop);
	});

	it("leaves a type declaring none, and every built-in, no backdrop", () => {
		const registries = createTestRegistries();
		applyObjectDefinition(registries, "plain", buildFakeDefinition("plain"));

		expect(registries.objectLabelBackdrop.get("plain")).toBeUndefined();
		// A filled rect is no backdrop: only a declared frame counts.
		expect(registries.objectLabelBackdrop.get("rect")).toBeUndefined();
	});
});
