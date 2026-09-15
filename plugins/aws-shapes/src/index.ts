// Two shapes for AWS architecture diagrams, built on the public API of canvas /
// canvas-sdk alone. createFrameObjectDoc / createFrameObjectDefinition derive
// both the ObjectDocDefinition and the ObjectTypeDefinition from the features
// and the defaults.
//
// - awsIcon … a node drawing one AWS Architecture Icon, labelled underneath
// - awsGroup … a VPC / subnet / … frame whose colour, line style and corner
//   badge all follow from `kind`
//
// The drawings live in a data module generated from an unpacked AWS asset
// package (scripts/generateIconData.mjs). What may be done with them is in
// LICENSE-ICONS.md. The headless way in (parse-time validation) is ./doc, with
// awsShapesDocPlugin.
export * from "./schema/AwsIconDoc";
export * from "./schema/AwsGroupDoc";
export * from "./state/AwsIconState";
export * from "./state/AwsGroupState";

export type {
	AwsIconEntry,
	AwsIconNode,
	AwsIconTier,
} from "./schema/icon/AwsIconNode";
export { AWS_ICON_TIERS } from "./schema/icon/AwsIconNode";
export { AWS_ICON_ALIASES } from "./schema/icon/iconAliases";
export {
	AWS_ICON_ENTRIES,
	AWS_ICON_RELEASE,
	AWS_ICON_SOURCE_URL,
} from "./schema/icon/iconData.generated";
export { normalizeAwsIconName } from "./schema/icon/normalizeAwsIconName";
export {
	isKnownAwsIconName,
	readAwsIcon,
	resolveAwsIconName,
} from "./schema/icon/resolveAwsIconName";
export { suggestAwsIconNames } from "./schema/icon/suggestAwsIconNames";
export {
	AWS_TIER1_ICON_NAMES,
	AWS_TIER1_ICONS,
} from "./schema/icon/tier1Icons";
export type { AwsTier1Icon } from "./schema/icon/tier1Icons";
export {
	AWS_GROUP_KIND_STYLES,
	readAwsGroupKindStyle,
} from "./schema/awsGroupKinds";
export type { AwsGroupKindStyle } from "./schema/awsGroupKinds";
export {
	calcAwsGroupLabelTextRegion,
	calcAwsGroupVisualBounds,
} from "./presentation/calcAwsGroupLabelTextRegion";
export { validateAwsGroupKind } from "./schema/validateAwsGroupKind";
export { validateAwsIconName } from "./schema/validateAwsIconName";

export { AwsGroup } from "./presentation/AwsGroup";
export { AwsIcon } from "./presentation/AwsIcon";
export { AwsIconArt, renderAwsIconNodes } from "./presentation/AwsIconArt";
export {
	calcAwsIconArtPlacement,
	readViewBoxSize,
} from "./presentation/calcAwsIconArtPlacement";
export type { AwsIconArtPlacement } from "./presentation/calcAwsIconArtPlacement";
export { readAwsIconDrawing } from "./presentation/readAwsIconDrawing";
export { resolveAwsGroupStroke } from "./presentation/resolveAwsGroupStroke";
export type { AwsGroupStroke } from "./presentation/resolveAwsGroupStroke";

export { AwsIconGlyph } from "./menu/AwsIconGlyph";
export { AwsIconPickerMenu } from "./menu/AwsIconPickerMenu";
export { AWS_ICON_CATEGORIES, searchAwsIcons } from "./menu/searchAwsIcons";
export type { AwsIconFilter, AwsIconSearchResult } from "./menu/searchAwsIcons";

export { awsShapesMessagesByLocale } from "./messages/awsShapesMessages";

export { createAwsGroupFrameIcon } from "./stencil/createAwsGroupFrameIcon";
export { createAwsStencilIcon } from "./stencil/createAwsStencilIcon";
export {
	AWS_ICON_STENCIL_IDS,
	AwsIconStencils,
} from "./stencil/AwsIconStencils";
export {
	AWS_GROUP_STENCIL_IDS,
	AwsGroupStencils,
} from "./stencil/AwsGroupStencils";
export { awsStencilCategory } from "./stencil/AwsIconStencilCategory";
export { awsGroupStencilCategory } from "./stencil/AwsGroupStencilCategory";

export { awsGroupDefinition, awsIconDefinition } from "./definition";
export {
	awsGroupDocDefinition,
	awsIconDocDefinition,
	awsShapesDocPlugin,
} from "./doc";
export { awsShapesPlugin } from "./plugin";
