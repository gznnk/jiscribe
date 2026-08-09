import { describe, expect, it } from "vitest";

import { defineObject } from "../../../plugin/ObjectTypeDefinition";
import type { ObjectTypeDefinition } from "../../../plugin/ObjectTypeDefinition";
import type { ObjectContentResizer } from "../../../states/registry/ObjectContentResizerRegistry";
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

describe("applyObjectDefinition: contentResizer", () => {
	it("registers the declaration for the type declaring it", () => {
		const registries = createTestRegistries();
		const contentResizer: ObjectContentResizer = (state) => state;
		applyObjectDefinition(
			registries,
			"measured",
			defineObject({
				...buildFakeDefinition("measured"),
				contentResizer,
			}),
		);

		expect(registries.objectContentResizer.get("measured")).toBe(
			contentResizer,
		);
	});

	it("leaves types that declare nothing unregistered", () => {
		const registries = createTestRegistries();
		applyObjectDefinition(registries, "plain", buildFakeDefinition("plain"));

		expect(registries.objectContentResizer.get("plain")).toBeUndefined();
	});

	it("registers exactly one built-in: the only stock type whose doc stores no size", () => {
		const registries = createTestRegistries();

		expect(registries.objectContentResizer.get("text")).toBeDefined();
		for (const type of [
			"rect",
			"ellipse",
			"group",
			"polygon",
			"polyline",
			"connector",
			"svg",
		]) {
			expect(registries.objectContentResizer.get(type)).toBeUndefined();
		}
	});
});
