// The headless entry (no UI). The same role canvas's ./doc plays: what a server,
// a diagnostic or the MCP reads to take part in parse-time validation without
// pulling react in. Only ./schema/** and @jiscribe/doc / @jiscribe/canvas-sdk/doc
// may be imported here.
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";
import { calcOutsideBoxTextRegion } from "@jiscribe/doc";
import type { CanvasDocPlugin, ObjectDocDefinition } from "@jiscribe/doc";

import {
	AWS_GROUP_DOC_DEFAULTS,
	AWS_GROUP_KINDS,
	AwsGroupExtraKeys,
	AwsGroupFeatures,
} from "./schema/AwsGroupDoc";
import {
	AWS_ICON_DOC_DEFAULTS,
	AwsIconExtraKeys,
	AwsIconFeatures,
} from "./schema/AwsIconDoc";
import { validateAwsGroupKind } from "./schema/validateAwsGroupKind";
import { validateAwsIconName } from "./schema/validateAwsIconName";

export const awsIconDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: AwsIconFeatures,
	defaults: AWS_ICON_DOC_DEFAULTS,
	extraKeys: AwsIconExtraKeys,
	// The drawing fills the box and the label hangs outside it, below.
	textRegion: calcOutsideBoxTextRegion,
	description:
		'One icon from the official AWS Architecture Icons set, drawn as a node: it holds text and can be a connector endpoint, so arrows attach to it directly. `icon` names the picture, as a layer-prefixed kebab-case name — "service/aws-lambda" (an AWS service), "resource/amazon-ec2/instance" (a resource of a service), "general/user" (a generic figure). Common short names resolve too ("lambda", "s3", "ec2", "alb", "igw"), as does a name with the "amazon-"/"aws-" prefix or the layer prefix dropped where that is unambiguous; a name that resolves to nothing is a validation error carrying suggestions. `text` is drawn as a label below the box, auto-sized to itself, so keep it to the short service name ("Lambda", "S3"). There is no stroke or fill: AWS forbids recolouring its icons. Keep the box square (the 64x64 default) — the drawing is scaled uniformly and centred, so a non-square box only adds margin. Put these inside an awsGroup frame to show which VPC or subnet they live in.',
	summary: "AWS service / resource icon (a labelled, connectable node)",
	// Placed at its default size and adjusted afterwards. Dragging a box out
	// would only centre the drawing on the shorter side, so offering that way in
	// would look like a bug.
	supportsBounds: false,
	validateExtra: validateAwsIconName,
});

export const awsGroupDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: AwsGroupFeatures,
	defaults: AWS_GROUP_DOC_DEFAULTS,
	extraKeys: AwsGroupExtraKeys,
	// The label goes in a band sized from the text rather than bound to the box
	// (calcAwsGroupLabelTextRegion, on the UI side). The headless overflow check
	// treats it as text outside the box, and autoHeight is off because sizing the
	// box from the text would swallow whatever the frame surrounds.
	textRegion: calcOutsideBoxTextRegion,
	autoHeight: false,
	description: `A boundary frame of an AWS architecture diagram: the VPC, subnet, availability zone or account that the icons inside belong to. \`kind\` picks which one, and the border colour, the line style and the corner badge all follow from it — one of: ${AWS_GROUP_KINDS.join(", ")}. \`text\` is the frame's title, drawn at the top left beside the badge, never in the body. Objects go inside it by geometry alone: give them coordinates within the box and place them after the frame in \`root\` so they paint on top. The body is click-through, so the icons lying over it stay selectable, and the frame does not carry its contents when it moves — wrap them in a GroupDoc when they must move together. Nest them the way AWS does: aws-cloud > region > vpc > public-subnet / private-subnet. Setting \`stroke\` or \`strokeDashType\` overrides what the kind would have chosen.`,
	summary: "AWS boundary frame (VPC, subnet, region, account)",
	validateExtra: validateAwsGroupKind,
});

/**
 * The headless `CanvasDocPlugin`: it teaches `createCanvasParser` the two types
 * and loads no drawing code at all.
 */
export const awsShapesDocPlugin: CanvasDocPlugin = {
	id: "aws-shapes",
	objects: {
		awsIcon: awsIconDocDefinition,
		awsGroup: awsGroupDocDefinition,
	},
};

// The name tables and the palette order are read by headless consumers too (the
// AI documentation generator, diagnostics). Taking them through the UI entry
// would pull react in, so they leave from here.
export { AWS_ICON_ALIASES } from "./schema/icon/iconAliases";
export {
	AWS_ICON_RELEASE,
	AWS_ICON_SOURCE_URL,
	AWS_ICON_ENTRIES,
} from "./schema/icon/iconData.generated";
export {
	AWS_TIER1_ICON_NAMES,
	AWS_TIER1_ICONS,
} from "./schema/icon/tier1Icons";
export type { AwsTier1Icon } from "./schema/icon/tier1Icons";
export {
	isKnownAwsIconName,
	readAwsIcon,
	resolveAwsIconName,
} from "./schema/icon/resolveAwsIconName";
export { normalizeAwsIconName } from "./schema/icon/normalizeAwsIconName";
export { suggestAwsIconNames } from "./schema/icon/suggestAwsIconNames";
export {
	AWS_GROUP_KIND_STYLES,
	readAwsGroupKindStyle,
} from "./schema/awsGroupKinds";
export type { AwsGroupKindStyle } from "./schema/awsGroupKinds";
export {
	AWS_GROUP_KINDS,
	DEFAULT_AWS_GROUP_KIND,
	isAwsGroupKind,
} from "./schema/AwsGroupDoc";
export type { AwsGroupDashType, AwsGroupKind } from "./schema/AwsGroupDoc";
