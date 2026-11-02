import type { Stencil } from "@jiscribe/canvas";
import {
	createIconSetStencils,
	toIconSetStencilId,
} from "@jiscribe/canvas-sdk";

import { AZURE_ICON_DRAWINGS } from "../drawing/iconDrawings.generated";
import { azureIconCatalog } from "../schema/icon/azureIconCatalog";

/** Put before every azureIcon preset id (`azureIconVirtualMachine`). */
export const AZURE_ICON_STENCIL_ID_PREFIX = "azureIcon";

/**
 * One azureIcon preset per icon in the set, so a library search can place any
 * of them; only {@link AZURE_ICON_STENCIL_IDS} are laid out up front. A palette
 * preset comes with the product's official name already in its label.
 */
export const AzureIconStencils: Stencil[] = createIconSetStencils({
	objectType: "azureIcon",
	stencilIdPrefix: AZURE_ICON_STENCIL_ID_PREFIX,
	catalog: azureIconCatalog,
	drawings: AZURE_ICON_DRAWINGS,
});

/** The preset ids in palette order, for a host composing a toolbar of its own. */
export const AZURE_ICON_STENCIL_IDS: readonly string[] =
	azureIconCatalog.paletteNames.map((icon) =>
		toIconSetStencilId(AZURE_ICON_STENCIL_ID_PREFIX, icon),
	);
