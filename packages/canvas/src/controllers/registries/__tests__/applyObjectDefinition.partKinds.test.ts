import { describe, expect, it } from "vitest";

import { defineObject } from "../../../plugin/ObjectTypeDefinition";
import type { ObjectTypeDefinition } from "../../../plugin/ObjectTypeDefinition";
import type { ObjectPartKindDefinition } from "../../selection/partKinds/ObjectPartKindRegistry";
import { TEXT_SLOT_PART_KIND } from "../../selection/partKinds/textSlotPartKind";
import { applyObjectDefinition } from "../applyObjectDefinition";
import { createTestRegistries } from "../createCanvasRegistries";

// Minimal stand-in for an object type, mirroring buildFakeDefinition in
// createCanvasRegistries.test.ts.
const buildFakeDefinition = (
	type: string,
	text: "slots" | "body" | undefined,
): ObjectTypeDefinition =>
	defineObject({
		features: { type, geometry: "rect", ...(text ? { text } : {}) },
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

describe("applyObjectDefinition: partKinds", () => {
	it("gives a slots type the textSlot kind without it declaring one", () => {
		const registries = createTestRegistries();
		applyObjectDefinition(
			registries,
			"record",
			buildFakeDefinition("record", "slots"),
		);

		const part = registries.objectPartKind.get("record", TEXT_SLOT_PART_KIND);
		expect(
			part?.has({ text: { name: { text: "User" } } } as never, "name"),
		).toBe(true);
		expect(
			part?.has({ text: { name: { text: "User" } } } as never, "rows"),
		).toBe(false);
	});

	it("lets the type's own textSlot declaration replace the automatic one", () => {
		const registries = createTestRegistries();
		const declared: ObjectPartKindDefinition = {
			kind: TEXT_SLOT_PART_KIND,
			has: () => true,
		};
		applyObjectDefinition(
			registries,
			"record",
			defineObject({
				...buildFakeDefinition("record", "slots"),
				partKinds: [declared],
			}),
		);

		expect(registries.objectPartKind.get("record", TEXT_SLOT_PART_KIND)).toBe(
			declared,
		);
	});

	it("leaves a type whose text is one body without the kind", () => {
		const registries = createTestRegistries();
		applyObjectDefinition(
			registries,
			"note",
			buildFakeDefinition("note", "body"),
		);

		expect(
			registries.objectPartKind.get("note", TEXT_SLOT_PART_KIND),
		).toBeUndefined();
	});

	it("keeps the kinds a slots type declares alongside the automatic one", () => {
		const registries = createTestRegistries();
		const vertex: ObjectPartKindDefinition = {
			kind: "vertex",
			has: () => true,
		};
		applyObjectDefinition(
			registries,
			"record",
			defineObject({
				...buildFakeDefinition("record", "slots"),
				partKinds: [vertex],
			}),
		);

		expect(registries.objectPartKind.get("record", "vertex")).toBe(vertex);
		expect(
			registries.objectPartKind.get("record", TEXT_SLOT_PART_KIND),
		).toBeDefined();
	});
});
