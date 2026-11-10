import type { ObjectTypeDefinition } from "@jiscribe/canvas";
import { createFrameObjectDefinition } from "@jiscribe/canvas-sdk";

import { awsGroupDocDefinition, awsIconDocDefinition } from "./doc";
import { AwsGroup } from "./presentation/AwsGroup";
import { AwsIcon } from "./presentation/AwsIcon";
import {
	calcAwsGroupLabelTextRegion,
	calcAwsGroupVisualBounds,
} from "./presentation/calcAwsGroupLabelTextRegion";
import type { AwsGroupDoc } from "./schema/AwsGroupDoc";
import { isAwsGroupKind } from "./schema/AwsGroupDoc";
import type { AwsIconDoc } from "./schema/AwsIconDoc";
import { awsIconCatalog } from "./schema/icon/awsIconCatalog";
import type { AwsGroupState } from "./state/AwsGroupState";
import type { AwsIconState } from "./state/AwsIconState";
import { AwsGroupStencils } from "./stencil/AwsGroupStencils";
import { AwsIconStencils } from "./stencil/AwsIconStencils";
import { AWS_GROUP_STYLE_ENTRIES } from "./style/awsStyleEntries";

/**
 * The label hangs below the box (`features.text: "label"`, which the core
 * places along with the background painted behind it).
 *
 * The menu offers no stroke and no fill (the features carry neither). AWS
 * forbids altering its icons, so that is a deliberate gap rather than an
 * omission. Nor does it offer the icon: which one a shape draws is chosen by
 * the stencil it is placed from (awsStencilCategory).
 */
export const awsIconDefinition: ObjectTypeDefinition<AwsIconDoc, AwsIconState> =
	createFrameObjectDefinition<AwsIconDoc, AwsIconState>({
		doc: awsIconDocDefinition,
		// The same resolution the doc validation runs: a name no document may
		// carry does not reach the drawing through a state either.
		isExtraStateValid: (state) =>
			state.icon === undefined ||
			(typeof state.icon === "string" &&
				awsIconCatalog.isKnownName(state.icon)),
		component: AwsIcon,
		stencils: AwsIconStencils,
		// The label's background sits under the section id every label type's
		// does, so selecting this beside another label type keeps it.
		menu: [
			{ id: "label-style", items: [{ type: "labelBackgroundColor" }] },
			{ id: "text", items: [{ type: "font" }, { type: "textFormat" }] },
		],
	});

/**
 * The label band is sized from the text and a long label runs past the frame's
 * right edge, so this `"innerLabel"` type places it with `textRegion` and
 * `visualBounds` together, without which zoom-to-fit and the export would crop
 * that off.
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
	// The same range the doc validation accepts. The drawing side falls back to
	// the default kind, so an unknown one is stopped at the state's door.
	isExtraStateValid: (state) =>
		state.kind === undefined || isAwsGroupKind(state.kind),
	component: AwsGroup,
	visualBounds: calcAwsGroupVisualBounds,
	textRegion: calcAwsGroupLabelTextRegion,
	styleEntries: AWS_GROUP_STYLE_ENTRIES,
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
		{
			id: "text",
			items: [
				{ type: "font" },
				{ type: "textFormat" },
				{ type: "textAlignment", vertical: false },
			],
		},
	],
});
