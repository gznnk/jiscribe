// One shape for Azure architecture diagrams, built on the public API of canvas
// / canvas-sdk alone: azureIcon, a node drawing one Azure Architecture Icon (or
// Microsoft Entra ID), labelled underneath. There is no frame shape; the
// container plugin's frames serve for subscriptions, resource groups and
// virtual networks.
//
// The icons are generated from Microsoft's Azure icon package, plus Microsoft
// Entra ID from the Entra icon package (scripts/generateIconData.mjs), into two
// modules: the catalog (names, labels, categories), which the headless side
// reads, and the drawings, which only this entry loads. What may be done with the drawings is in LICENSE-ICONS.md. The
// headless way in (parse-time validation) is ./doc, with azureShapesDocPlugin.
export * from "./schema/AzureIconDoc";
export * from "./state/AzureIconState";

export { azureIconCatalog } from "./schema/icon/azureIconCatalog";
export { AZURE_ICON_ALIASES } from "./schema/icon/iconAliases";
export {
	AZURE_ICON_CATALOG_ENTRIES,
	AZURE_ICON_RELEASE,
	AZURE_ICON_SOURCE_URL,
	ENTRA_ICON_RELEASE,
	ENTRA_ICON_SOURCE_URL,
} from "./schema/icon/iconCatalog.generated";
export { AZURE_ICON_DRAWINGS } from "./drawing/iconDrawings.generated";
export {
	AZURE_TIER1_ICON_NAMES,
	AZURE_TIER1_ICONS,
} from "./schema/icon/tier1Icons";

export { AzureIcon } from "./presentation/AzureIcon";
export {
	AZURE_ICON_STENCIL_IDS,
	AzureIconStencils,
} from "./stencil/AzureIconStencils";
export { azureStencilCategory } from "./stencil/AzureIconStencilCategory";

export { azureIconDefinition } from "./definition";
export { azureIconDocDefinition, azureShapesDocPlugin } from "./doc";
export { azureShapesPlugin } from "./plugin";
