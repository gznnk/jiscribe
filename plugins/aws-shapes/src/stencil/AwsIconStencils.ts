import type { Stencil } from "@jiscribe/canvas";
import {
	createIconSetStencils,
	toIconSetStencilId,
} from "@jiscribe/canvas-sdk";

import { AWS_ICON_DRAWINGS } from "../drawing/iconDrawings.generated";
import { awsIconCatalog } from "../schema/icon/awsIconCatalog";

/** Put before every awsIcon preset id (`awsIconServiceAwsLambda`). */
export const AWS_ICON_STENCIL_ID_PREFIX = "awsIcon";

/**
 * One awsIcon preset per icon in the set, so a library search can place any of
 * them; only {@link AWS_ICON_STENCIL_IDS} are laid out up front. A palette
 * preset comes with tier 1's short name (`Lambda`, `S3`) already in its label.
 */
export const AwsIconStencils: Stencil[] = createIconSetStencils({
	objectType: "awsIcon",
	stencilIdPrefix: AWS_ICON_STENCIL_ID_PREFIX,
	catalog: awsIconCatalog,
	drawings: AWS_ICON_DRAWINGS,
});

/** The preset ids in palette order, for a host composing a toolbar of its own. */
export const AWS_ICON_STENCIL_IDS: readonly string[] =
	awsIconCatalog.paletteNames.map((icon) =>
		toIconSetStencilId(AWS_ICON_STENCIL_ID_PREFIX, icon),
	);
