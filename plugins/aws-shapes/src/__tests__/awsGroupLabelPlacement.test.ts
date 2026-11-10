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

// The UI definition places the label itself (textRegion + visualBounds), so this
// reads what registration answers: a "label" type declaring neither would get
// the core's caption under the box.
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

// A "label" type the definition gives no menu or panel of its own is offered
// the background by the defaults, so these read what the definition declares.
describe("awsGroup's label background", () => {
	const itemTypes = (
		sections: readonly { items: readonly { type: string }[] }[] | undefined,
	) =>
		(sections ?? []).flatMap((section) =>
			section.items.map((item) => item.type),
		);

	it("is offered neither in the object menu nor in the properties panel", () => {
		expect(awsGroupDefinition.menu).toBeDefined();
		expect(itemTypes(awsGroupDefinition.menu)).not.toContain(
			"labelBackgroundColor",
		);
		expect(awsGroupDefinition.propertyPanel).toBeDefined();
		expect(itemTypes(awsGroupDefinition.propertyPanel)).not.toContain(
			"labelBackgroundColor",
		);
	});

	it("keeps the rest of the panel the features would derive", () => {
		expect(itemTypes(awsGroupDefinition.propertyPanel)).toEqual([
			"position",
			"size",
			"rotation",
			"lockAspectRatio",
			"fill",
			"fillOpacity",
			"strokeColor",
			"strokeWidth",
			"strokeDashType",
			"strokeOpacity",
			"fontFamily",
			"fontSize",
			"fontColor",
			"textFormat",
			"textAlign",
		]);
	});
});
