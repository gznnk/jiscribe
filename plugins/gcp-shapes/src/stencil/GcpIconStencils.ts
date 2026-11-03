import type { Stencil } from "@jiscribe/canvas";
import {
	createIconSetStencils,
	toIconSetStencilId,
} from "@jiscribe/canvas-sdk";

import { GCP_ICON_DRAWINGS } from "../drawing/iconDrawings.generated";
import { gcpIconCatalog } from "../schema/icon/gcpIconCatalog";

/** Put before every gcpIcon preset id (`gcpIconComputeEngine`). */
export const GCP_ICON_STENCIL_ID_PREFIX = "gcpIcon";

/**
 * One gcpIcon preset per icon in the set, so a library search can place any
 * of them; only {@link GCP_ICON_STENCIL_IDS} are laid out up front. A palette
 * preset comes with the product's official name already in its label.
 */
export const GcpIconStencils: Stencil[] = createIconSetStencils({
	objectType: "gcpIcon",
	stencilIdPrefix: GCP_ICON_STENCIL_ID_PREFIX,
	catalog: gcpIconCatalog,
	drawings: GCP_ICON_DRAWINGS,
});

/** The preset ids in palette order, for a host composing a toolbar of its own. */
export const GCP_ICON_STENCIL_IDS: readonly string[] =
	gcpIconCatalog.paletteNames.map((icon) =>
		toIconSetStencilId(GCP_ICON_STENCIL_ID_PREFIX, icon),
	);
