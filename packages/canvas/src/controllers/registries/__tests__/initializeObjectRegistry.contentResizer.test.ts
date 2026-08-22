import { describe, expect, it } from "vitest";

import { defineObject } from "../../../plugin/ObjectTypeDefinition";
import type { ObjectTypeDefinition } from "../../../plugin/ObjectTypeDefinition";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type {
	ObjectContentResizeContext,
	ObjectContentResizer,
} from "../../../states/registry/ObjectContentResizerRegistry";
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

	it("hands the resizer of a type declaring text defaults those defaults on its context", () => {
		const registries = createTestRegistries();
		let seen: ObjectContentResizeContext | undefined;
		applyObjectDefinition(
			registries,
			"measured",
			defineObject({
				...buildFakeDefinition("measured"),
				features: { type: "measured", geometry: "rect", text: "body" },
				defaults: {
					type: "measured",
					x: 0,
					y: 0,
					textAlign: "left",
				} as ObjectTypeDefinition["defaults"],
				contentResizer: (state, context) => {
					seen = context;
					return state;
				},
			}),
		);

		registries.objectContentResizer.get("measured")?.(
			{ id: "m1", type: "measured" } as ObjectState,
			{},
		);

		expect(seen).toEqual({ textStyleDefaults: { textAlign: "left" } });
	});

	it("leaves types that declare nothing unregistered", () => {
		const registries = createTestRegistries();
		applyObjectDefinition(registries, "plain", buildFakeDefinition("plain"));

		expect(registries.objectContentResizer.get("plain")).toBeUndefined();
	});

	it("registers the two built-ins whose box can be derived: the one storing no size, and the one whose doc may leave its height out", () => {
		const registries = createTestRegistries();

		expect(registries.objectContentResizer.get("text")).toBeDefined();
		expect(registries.objectContentResizer.get("rect")).toBeDefined();
		for (const type of [
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

	it("leaves the derivation inert for an object of an auto-height type that states its height", () => {
		const registries = createTestRegistries();
		const stated = {
			id: "r1",
			type: "rect",
			cx: 50,
			cy: 50,
			width: 100,
			height: 40,
		} as unknown as ObjectState;

		expect(registries.objectContentResizer.get("rect")?.(stated, {})).toBe(
			stated,
		);
	});
});
