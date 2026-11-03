import { createIconSetObject } from "@jiscribe/canvas-sdk";

import { GCP_ICON_DRAWINGS } from "../drawing/iconDrawings.generated";
import { DEFAULT_GCP_ICON_NAME } from "../schema/GcpIconDoc";
import { gcpIconCatalog } from "../schema/icon/gcpIconCatalog";
import type { GcpIconState } from "../state/GcpIconState";

/**
 * Draws gcpIcon: the asset's viewBox scaled uniformly onto the box's shorter
 * side and centred, the label hung below, and a dashed frame for a name that
 * cannot be drawn (createIconSetObject).
 */
export const GcpIcon = createIconSetObject<GcpIconState>({
	defaultIcon: DEFAULT_GCP_ICON_NAME,
	catalog: gcpIconCatalog,
	drawings: GCP_ICON_DRAWINGS,
});
