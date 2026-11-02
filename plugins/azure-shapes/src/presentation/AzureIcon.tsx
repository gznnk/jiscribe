import { createIconSetObject } from "@jiscribe/canvas-sdk";

import { AZURE_ICON_DRAWINGS } from "../drawing/iconDrawings.generated";
import { DEFAULT_AZURE_ICON_NAME } from "../schema/AzureIconDoc";
import { azureIconCatalog } from "../schema/icon/azureIconCatalog";
import type { AzureIconState } from "../state/AzureIconState";

/**
 * Draws azureIcon: the asset's viewBox scaled uniformly onto the box's shorter
 * side and centred, the label hung below, and a dashed frame for a name that
 * cannot be drawn (createIconSetObject).
 */
export const AzureIcon = createIconSetObject<AzureIconState>({
	defaultIcon: DEFAULT_AZURE_ICON_NAME,
	catalog: azureIconCatalog,
	drawings: AZURE_ICON_DRAWINGS,
});
