// One shape for Google Cloud architecture diagrams, built on the public API of
// canvas / canvas-sdk alone: gcpIcon, a node drawing one Google Cloud product
// icon (a core product's own, or a category's), labelled underneath. There is
// no frame shape; the container plugin's frames serve for projects, regions and
// VPC networks.
//
// The icons are generated from Google's core products and category icon
// packages (scripts/generateIconData.mjs) into two modules: the catalog (names,
// labels, categories), which the headless side reads, and the drawings, which
// only this entry loads. What may be done with the drawings is in
// LICENSE-ICONS.md. The headless way in (parse-time validation) is ./doc, with
// gcpShapesDocPlugin.
export * from "./schema/GcpIconDoc";
export * from "./state/GcpIconState";

export { gcpIconCatalog } from "./schema/icon/gcpIconCatalog";
export { GCP_GENERAL_PRODUCT_ICONS } from "./schema/icon/generalProducts";
export { GCP_ICON_ALIASES } from "./schema/icon/iconAliases";
export {
	GCP_ICON_CATALOG_ENTRIES,
	GCP_ICON_CATEGORY_ZIP_URL,
	GCP_ICON_CORE_ZIP_URL,
	GCP_ICON_RELEASE,
	GCP_ICON_SOURCE_URL,
} from "./schema/icon/iconCatalog.generated";
export { GCP_ICON_DRAWINGS } from "./drawing/iconDrawings.generated";
export {
	GCP_TIER1_ICON_NAMES,
	GCP_TIER1_ICONS,
} from "./schema/icon/tier1Icons";

export { GcpIcon } from "./presentation/GcpIcon";
export {
	GCP_ICON_STENCIL_IDS,
	GcpIconStencils,
} from "./stencil/GcpIconStencils";
export { gcpStencilCategory } from "./stencil/GcpIconStencilCategory";

export { gcpIconDefinition } from "./definition";
export { gcpIconDocDefinition, gcpShapesDocPlugin } from "./doc";
export { gcpShapesPlugin } from "./plugin";
