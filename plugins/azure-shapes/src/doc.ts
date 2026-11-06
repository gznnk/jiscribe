// The headless entry (no UI): what a server, a diagnostic or the MCP reads to
// take part in parse-time validation without pulling react in. Only
// ./schema/** and @jiscribe/doc / @jiscribe/canvas-sdk/doc may be imported
// here, and none of the drawings: the catalog of names is all it loads.
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";
import type { CanvasDocPlugin, ObjectDocDefinition } from "@jiscribe/doc";

import {
	AZURE_ICON_DOC_DEFAULTS,
	AzureIconExtraKeys,
	AzureIconFeatures,
} from "./schema/AzureIconDoc";
import { azureIconCatalog } from "./schema/icon/azureIconCatalog";

export const azureIconDocDefinition: ObjectDocDefinition = createFrameObjectDoc(
	{
		features: AzureIconFeatures,
		defaults: AZURE_ICON_DOC_DEFAULTS,
		extraKeys: AzureIconExtraKeys,
		description:
			'One icon from Microsoft\'s official Azure Architecture Icons, or Microsoft Entra ID from the Microsoft Entra architecture icons, drawn as a node: it holds text and can be a connector endpoint, so arrows attach to it directly. `icon` names the picture as a flat kebab-case name with no category prefix — "virtual-machine", "azure-cosmos-db", "app-services", "key-vaults". Common short names resolve too ("vm", "aks", "vnet", "kv", "apim", "cosmos"; "entra" and "aad" reach "entra-id"), as does a name with the "azure-"/"microsoft-" prefix dropped where that is unambiguous ("cosmos-db", "service-bus"); a name that resolves to nothing is a validation error carrying suggestions. `text` is drawn as a label below the box, auto-sized to itself: write the product\'s official name there ("Azure Cosmos DB", "Azure Kubernetes Service"), which Microsoft\'s terms ask to be placed near the icon. There is no stroke or fill: the icons may not be recoloured or altered. Keep the box square (the 64x64 default) — the drawing is scaled uniformly and centred, so a non-square box only adds margin. Group them with a container frame to show which subscription, resource group or virtual network they live in.',
		summary: "Azure service icon (a labelled, connectable node)",
		// Placed at its default size and adjusted afterwards. Dragging a box out
		// would only centre the drawing on the shorter side.
		supportsBounds: false,
		validateExtra: azureIconCatalog.validateIconName,
	},
);

/**
 * The headless `CanvasDocPlugin`: it teaches `createCanvasParser` the type and
 * loads no drawing code at all.
 */
export const azureShapesDocPlugin: CanvasDocPlugin = {
	id: "azure-shapes",
	objects: { azureIcon: azureIconDocDefinition },
};

// The name tables and the palette order are read by headless consumers too (the
// AI documentation generator, diagnostics). The drawings are not: they are
// AZURE_ICON_DRAWINGS, from the UI entry alone.
export { azureIconCatalog } from "./schema/icon/azureIconCatalog";
export { AZURE_ICON_ALIASES } from "./schema/icon/iconAliases";
export {
	AZURE_ICON_CATALOG_ENTRIES,
	AZURE_ICON_RELEASE,
	AZURE_ICON_SOURCE_URL,
	ENTRA_ICON_RELEASE,
	ENTRA_ICON_SOURCE_URL,
} from "./schema/icon/iconCatalog.generated";
export {
	AZURE_TIER1_ICON_NAMES,
	AZURE_TIER1_ICONS,
} from "./schema/icon/tier1Icons";
