import type { ObjectTypeDefinition } from "@jiscribe/canvas";
import {
	calcBelowLabelTextRegion,
	calcBelowLabelVisualBounds,
	createFrameObjectDefinition,
} from "@jiscribe/canvas-sdk";

import { awsGroupDocDefinition, awsIconDocDefinition } from "./doc";
import { AwsIconPickerMenu } from "./menu/AwsIconPickerMenu";
import { AwsGroup } from "./presentation/AwsGroup";
import { AwsIcon } from "./presentation/AwsIcon";
import {
	calcAwsGroupLabelTextRegion,
	calcAwsGroupVisualBounds,
} from "./presentation/calcAwsGroupLabelTextRegion";
import type { AwsGroupDoc } from "./schema/AwsGroupDoc";
import {
	AwsGroupExtraStyleProperties,
	isAwsGroupKind,
} from "./schema/AwsGroupDoc";
import type { AwsIconDoc } from "./schema/AwsIconDoc";
import { AwsIconExtraStyleProperties } from "./schema/AwsIconDoc";
import { isKnownAwsIconName } from "./schema/icon/resolveAwsIconName";
import type { AwsGroupState } from "./state/AwsGroupState";
import type { AwsIconState } from "./state/AwsIconState";
import { AwsGroupStencils } from "./stencil/AwsGroupStencils";
import { AwsIconStencils } from "./stencil/AwsIconStencils";

/**
 * The label hangs outside the box (below it), so without a declared
 * `visualBounds` zoom-to-fit and the export viewBox would crop it away.
 *
 * The menu offers no stroke and no fill (the features carry neither). AWS
 * forbids altering its icons, so that is a deliberate gap rather than an
 * omission.
 */
export const awsIconDefinition: ObjectTypeDefinition<AwsIconDoc, AwsIconState> =
	createFrameObjectDefinition<AwsIconDoc, AwsIconState>({
		doc: awsIconDocDefinition,
		component: AwsIcon,
		textRegion: calcBelowLabelTextRegion,
		visualBounds: calcBelowLabelVisualBounds,
		// The same resolution the doc validation runs: a name no document may
		// carry does not reach the drawing through a state either.
		isExtraStateValid: (state) =>
			state.icon === undefined ||
			(typeof state.icon === "string" && isKnownAwsIconName(state.icon)),
		extraStyleProperties: AwsIconExtraStyleProperties,
		stencils: AwsIconStencils,
		menu: [
			{
				id: "aws-icon",
				items: [{ type: "custom", id: "icon", component: AwsIconPickerMenu }],
			},
			{ id: "text", items: [{ type: "fontStyle" }] },
			{ id: "transform", items: [{ type: "aspectRatio" }] },
		],
	});

/**
 * The label band is sized from the text and a long label runs past the frame's
 * right edge, so without a declared `visualBounds` zoom-to-fit and the export
 * would crop that off.
 *
 * The stroke menu is offered: the default follows `kind`, but telling two VPCs
 * apart in one diagram is worth an override (resolveAwsGroupStroke). AWS frames
 * have no rounded corners, hence `radius: false`.
 */
export const awsGroupDefinition: ObjectTypeDefinition<
	AwsGroupDoc,
	AwsGroupState
> = createFrameObjectDefinition<AwsGroupDoc, AwsGroupState>({
	doc: awsGroupDocDefinition,
	component: AwsGroup,
	textRegion: calcAwsGroupLabelTextRegion,
	visualBounds: calcAwsGroupVisualBounds,
	// The same range the doc validation accepts. The drawing side falls back to
	// the default kind, so an unknown one is stopped at the state's door.
	isExtraStateValid: (state) =>
		state.kind === undefined || isAwsGroupKind(state.kind),
	extraStyleProperties: AwsGroupExtraStyleProperties,
	stencils: AwsGroupStencils,
	menu: [
		{
			id: "style",
			items: [
				{ type: "backgroundColor" },
				{ type: "borderColor" },
				{ type: "borderStyle", radius: false },
			],
		},
		{ id: "text", items: [{ type: "fontStyle" }, { type: "textAlignment" }] },
		{ id: "transform", items: [{ type: "aspectRatio" }] },
	],
});
