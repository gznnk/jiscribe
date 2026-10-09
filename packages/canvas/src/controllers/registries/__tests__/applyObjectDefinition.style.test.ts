import { describe, expect, it } from "vitest";

import type { ObjectTypeDefinition } from "../../../plugin/ObjectTypeDefinition";
import { defineObject } from "../../../plugin/ObjectTypeDefinition";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { fieldEntry } from "../../style/entries/fieldEntry";
import type { StyleEntry } from "../../style/StyleEntry";
import { applyObjectDefinition } from "../applyObjectDefinition";
import { createTestRegistries } from "../createCanvasRegistries";

// Minimal stand-in for an object type, as in applyObjectDefinition.partKinds.test.ts.
const buildFakeDefinition = (
	type: string,
	own: Partial<ObjectTypeDefinition> = {},
): ObjectTypeDefinition =>
	defineObject({
		features: { type, geometry: "rect", fill: true },
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
		...own,
	});

const headerFill = fieldEntry("headerFill", "string");

describe("applyObjectDefinition: style", () => {
	it("registers a declared kind beside the derived ones", () => {
		const registries = createTestRegistries();
		applyObjectDefinition(
			registries,
			"container",
			buildFakeDefinition("container", {
				extraKeys: ["headerFill"],
				styleEntries: { headerFill },
			}),
		);

		const table = registries.objectStyle.get("container");
		expect(table?.["headerFill"]).toBe(headerFill);
		// The features' own entries are still there; the declaration adds to them.
		expect(table?.fill).toBeDefined();
	});

	it("lets a declared kind replace the one the features derive", () => {
		const registries = createTestRegistries();
		// A type whose face is not stored on the object itself states where the
		// fill really lands (a table's, on its cells); the derived entry gives way.
		const cellFill: StyleEntry<ObjectState, string> = {
			apply: (object) => object,
			read: () => [],
		};
		applyObjectDefinition(
			registries,
			"table",
			buildFakeDefinition("table", { styleEntries: { fill: cellFill } }),
		);

		expect(registries.objectStyle.get("table")?.fill).toBe(cellFill);
	});

	it("refuses an entry writing a field the type's doc does not hold", () => {
		const registries = createTestRegistries();
		expect(() =>
			applyObjectDefinition(
				registries,
				"container",
				buildFakeDefinition("container", {
					styleEntries: { headerFill: fieldEntry("headerFill", "string") },
				}),
			),
		).toThrow(/"container".*"headerFill".*does not hold/);
	});

	it("takes an entry writing a field only the dotted path's root has to name", () => {
		const registries = createTestRegistries();
		applyObjectDefinition(
			registries,
			"connector",
			buildFakeDefinition("connector", {
				extraKeys: ["label"],
				styleEntries: { "label.fill": fieldEntry("label.fill", "string") },
			}),
		);

		expect(
			registries.objectStyle.get("connector")?.["label.fill"],
		).toBeDefined();
	});
});
