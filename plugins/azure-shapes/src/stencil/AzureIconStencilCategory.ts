import type { StencilCategory } from "@jiscribe/canvas";
import { createIconSetStencilCategory } from "@jiscribe/canvas-sdk";

import { AZURE_ICON_STENCIL_ID_PREFIX } from "./AzureIconStencils";
import { AZURE_ICON_DRAWINGS } from "../drawing/iconDrawings.generated";
import { azureIconCatalog } from "../schema/icon/azureIconCatalog";

/**
 * The azureIcon category. Core's default bar does not carry it, so a host puts
 * it into `stencilLibrary.sections` (a sidebar section) or into
 * `toolbar.sections` as `{ type: "stencilCategory", category }` (a flyout).
 * The palette is listed up front; the shape library's "show all" view holds
 * the whole set.
 */
export const azureStencilCategory: StencilCategory =
	createIconSetStencilCategory({
		id: "azure",
		label: { en: "Azure", ja: "Azure" },
		icon: "virtual-machine",
		stencilIdPrefix: AZURE_ICON_STENCIL_ID_PREFIX,
		catalog: azureIconCatalog,
		drawings: AZURE_ICON_DRAWINGS,
	});
