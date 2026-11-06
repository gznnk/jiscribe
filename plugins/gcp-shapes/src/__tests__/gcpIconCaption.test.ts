import { createCanvasRegistries } from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import { calcLabelTextRegion } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { gcpIconDefinition } from "../definition";
import { gcpIconDocDefinition } from "../doc";

// The caption is the core's to place (`features.text: "label"`): what is left to
// the type is not to declare a placement of its own, and to offer the caption's
// background under the section id every label type's sits under, so the item
// survives a selection mixing it with another label type.
describe("gcpIcon's caption", () => {
	it("is a label text declaring no placement of its own", () => {
		expect(gcpIconDocDefinition.features.text).toBe("label");
		expect(gcpIconDocDefinition.textRegion).toBeUndefined();
		expect(gcpIconDefinition.visualBounds).toBeUndefined();
		expect(
			gcpIconDefinition.partKinds?.some(
				(part) => part.kind === TEXT_SLOT_PART_KIND,
			),
		).not.toBe(true);
	});

	it("hangs under the box once registered, measured with the type's own defaults", () => {
		const registries = createCanvasRegistries({
			plugins: [
				{ id: "gcpIcon-test", objects: { gcpIcon: gcpIconDefinition } },
			],
		});
		const state = {
			id: "gcpIcon-1",
			type: "gcpIcon",
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
			.get("gcpIcon", TEXT_SLOT_PART_KIND)
			?.region?.(state, "body");
		expect(region).toEqual(
			calcLabelTextRegion(
				state,
				state.text.body,
				registries.objectTextStyleDefaults.get("gcpIcon", "body"),
			),
		);
		expect(region?.y).toBeGreaterThan(32);
	});

	it("offers the caption's background under label-style", () => {
		expect(
			gcpIconDefinition.menu?.find((section) => section.id === "label-style")
				?.items,
		).toEqual([{ type: "labelBackgroundColor" }]);
	});
});
