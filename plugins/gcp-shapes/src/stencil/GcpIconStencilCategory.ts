import type { StencilCategory } from "@jiscribe/canvas";
import { createIconSetStencilCategory } from "@jiscribe/canvas-sdk";

import { GCP_ICON_STENCIL_ID_PREFIX } from "./GcpIconStencils";
import { GCP_ICON_DRAWINGS } from "../drawing/iconDrawings.generated";
import { gcpIconCatalog } from "../schema/icon/gcpIconCatalog";

/**
 * The gcpIcon category. Core's default bar does not carry it, so a host puts
 * it into `stencilLibrary.sections` (a sidebar section) or into
 * `toolbar.sections` as `{ type: "stencilCategory", category }` (a flyout).
 * The palette is listed up front; the shape library's "show all" view holds
 * the whole set.
 */
export const gcpStencilCategory: StencilCategory = createIconSetStencilCategory(
	{
		id: "gcp",
		label: { en: "Google Cloud", ja: "Google Cloud" },
		icon: "compute-engine",
		stencilIdPrefix: GCP_ICON_STENCIL_ID_PREFIX,
		catalog: gcpIconCatalog,
		drawings: GCP_ICON_DRAWINGS,
	},
);
