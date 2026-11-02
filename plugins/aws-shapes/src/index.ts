// Two shapes for AWS architecture diagrams, built on the public API of canvas /
// canvas-sdk alone. createFrameObjectDoc / createFrameObjectDefinition derive
// both the ObjectDocDefinition and the ObjectTypeDefinition from the features
// and the defaults.
//
// - awsIcon … a node drawing one AWS Architecture Icon, labelled underneath
// - awsGroup … a VPC / subnet / … frame whose colour, line style and corner
//   badge all follow from `kind`
//
// The icons are generated from an unpacked AWS asset package
// (scripts/generateIconData.mjs) into two modules: the catalog (names, labels,
// categories), which the headless side reads, and the drawings, which only this
// entry loads. What may be done with the drawings is in LICENSE-ICONS.md. The
// headless way in (parse-time validation) is ./doc, with awsShapesDocPlugin.
export * from "./schema/AwsIconDoc";
export * from "./schema/AwsGroupDoc";
export * from "./state/AwsIconState";
export * from "./state/AwsGroupState";

export { awsIconCatalog } from "./schema/icon/awsIconCatalog";
export type {
	AwsIconCatalogEntry,
	AwsIconTier,
} from "./schema/icon/AwsIconCatalogEntry";
export { AWS_ICON_TIERS } from "./schema/icon/AwsIconCatalogEntry";
export { AWS_ICON_ALIASES } from "./schema/icon/iconAliases";
export {
	AWS_ICON_CATALOG_ENTRIES,
	AWS_ICON_RELEASE,
	AWS_ICON_SOURCE_URL,
} from "./schema/icon/iconCatalog.generated";
export { AWS_ICON_DRAWINGS } from "./drawing/iconDrawings.generated";
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

export { AwsGroup } from "./presentation/AwsGroup";
export { AwsIcon } from "./presentation/AwsIcon";
export { resolveAwsGroupStroke } from "./presentation/resolveAwsGroupStroke";
export type { AwsGroupStroke } from "./presentation/resolveAwsGroupStroke";

export { createAwsGroupFrameIcon } from "./stencil/createAwsGroupFrameIcon";
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

export { AWS_GROUP_STYLE_ENTRIES } from "./style/awsStyleEntries";

export { awsGroupDefinition, awsIconDefinition } from "./definition";
export {
	awsGroupDocDefinition,
	awsIconDocDefinition,
	awsShapesDocPlugin,
} from "./doc";
export { awsShapesPlugin } from "./plugin";
