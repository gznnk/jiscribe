import { BODY_TEXT_SLOT_ID, createCanvasRegistries } from "@jiscribe/canvas";
import type { ObjectState } from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import { awsGroupDefinition } from "../definition";
import { awsShapesPlugin } from "../plugin";
import {
	calcAwsGroupLabelTextRegion,
	calcAwsGroupVisualBounds,
} from "../presentation/calcAwsGroupLabelTextRegion";
import { AWS_GROUP_DOC_DEFAULTS } from "../schema/AwsGroupDoc";

// The UI definition places the label itself (textRegion + visualBounds), which an
// "innerLabel" type must, so this reads what registration answers.
describe("awsGroup's label as the canvas places it", () => {
	const registries = createCanvasRegistries({ plugins: [awsShapesPlugin] });
	const state = awsGroupDefinition.mapper.toState({
		...AWS_GROUP_DOC_DEFAULTS,
		id: "group-1",
		text: "V".repeat(80),
	} as never) as ObjectState & { width: number; height: number };

	it("is the text slot region calcAwsGroupLabelTextRegion answers, in the header band", () => {
		const region = registries.objectPartKind
			.get("awsGroup", "textSlot")
			?.region?.(state, BODY_TEXT_SLOT_ID);
		expect(region).toEqual(
			calcAwsGroupLabelTextRegion(state as never, BODY_TEXT_SLOT_ID),
		);
		expect(region?.y).toBeLessThan(0);
	});

	it("widens the visual bounds by that region", () => {
		const bounds = registries.objectVisualBounds.get("awsGroup")?.(state);
		expect(bounds).toEqual(calcAwsGroupVisualBounds(state as never));
		// The long label runs past the frame's right edge.
		expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeGreaterThan(
			state.width / 2,
		);
	});
});

// The panel is derived from the features and the menu is declared; both are
// read as registration answers them, the background being a "label" type's alone.
describe("awsGroup's label background", () => {
	const registries = createCanvasRegistries({ plugins: [awsShapesPlugin] });
	const itemTypes = (
		sections: readonly { items: readonly { type: string }[] }[],
	) => sections.flatMap((section) => section.items.map((item) => item.type));

	it("is offered neither in the object menu nor in the properties panel", () => {
		const menu = registries.objectMenu.getSections("awsGroup");
		const panel = registries.propertyPanel.getSections("awsGroup");
		expect(menu.length).toBeGreaterThan(0);
		expect(itemTypes(menu)).not.toContain("labelBackgroundColor");
		expect(panel.length).toBeGreaterThan(0);
		expect(itemTypes(panel)).not.toContain("labelBackgroundColor");
		expect(panel.map((section) => section.id)).not.toContain("label-style");
	});
});
