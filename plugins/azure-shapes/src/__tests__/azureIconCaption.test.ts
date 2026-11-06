import { createCanvasRegistries } from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import { calcLabelTextRegion } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { azureIconDefinition } from "../definition";
import { azureIconDocDefinition } from "../doc";

// The caption is the core's to place (`features.text: "label"`): what is left to
// the type is not to declare a placement of its own, and to offer the caption's
// background under the section id every label type's sits under, so the item
// survives a selection mixing it with another label type.
describe("azureIcon's caption", () => {
	it("is a label text declaring no placement of its own", () => {
		expect(azureIconDocDefinition.features.text).toBe("label");
		expect(azureIconDocDefinition.textRegion).toBeUndefined();
		expect(azureIconDefinition.visualBounds).toBeUndefined();
		expect(
			azureIconDefinition.partKinds?.some(
				(part) => part.kind === TEXT_SLOT_PART_KIND,
			),
		).not.toBe(true);
	});

	it("hangs under the box once registered, measured with the type's own defaults", () => {
		const registries = createCanvasRegistries({
			plugins: [
				{ id: "azureIcon-test", objects: { azureIcon: azureIconDefinition } },
			],
		});
		const state = {
			id: "azureIcon-1",
			type: "azureIcon",
			cx: 0,
			cy: 0,
			width: 64,
			height: 64,
			scaleX: 1,
			scaleY: 1,
			rotation: 0,
			text: { body: { text: "Label" } },
		};
		const region = registries.objectPartKind
			.get("azureIcon", TEXT_SLOT_PART_KIND)
			?.region?.(state, "body");
		expect(region).toEqual(
			calcLabelTextRegion(
				state,
				state.text.body,
				registries.objectTextStyleDefaults.get("azureIcon", "body"),
			),
		);
		expect(region?.y).toBeGreaterThan(32);
	});

	it("offers the caption's background under label-style", () => {
		expect(
			azureIconDefinition.menu?.find((section) => section.id === "label-style")
				?.items,
		).toEqual([{ type: "labelBackgroundColor" }]);
	});
});
