import { createIconSetObject } from "@jiscribe/canvas-sdk";

import { AWS_ICON_DRAWINGS } from "../drawing/iconDrawings.generated";
import { DEFAULT_AWS_ICON_NAME } from "../schema/AwsIconDoc";
import { awsIconCatalog } from "../schema/icon/awsIconCatalog";
import type { AwsIconState } from "../state/AwsIconState";

/**
 * Draws awsIcon: the asset's viewBox scaled uniformly onto the box's shorter
 * side and centred, the label hung below, and a dashed frame for a name that
 * cannot be drawn (createIconSetObject).
 */
export const AwsIcon = createIconSetObject<AwsIconState>({
	defaultIcon: DEFAULT_AWS_ICON_NAME,
	catalog: awsIconCatalog,
	drawings: AWS_ICON_DRAWINGS,
});
