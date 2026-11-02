import type { StencilCategory } from "@jiscribe/canvas";
import { createIconSetStencilCategory } from "@jiscribe/canvas-sdk";

import { AWS_ICON_STENCIL_ID_PREFIX } from "./AwsIconStencils";
import { AWS_ICON_DRAWINGS } from "../drawing/iconDrawings.generated";
import { awsIconCatalog } from "../schema/icon/awsIconCatalog";

/**
 * The awsIcon category. Core's default bar does not carry it, so a host puts
 * it into `stencilLibrary.sections` (a sidebar section) or into
 * `toolbar.sections` as `{ type: "stencilCategory", category }` (a flyout).
 * The palette is listed up front; the shape library's "show all" view holds
 * the whole set.
 */
export const awsStencilCategory: StencilCategory = createIconSetStencilCategory(
	{
		id: "aws",
		label: { en: "AWS", ja: "AWS" },
		icon: "service/amazon-ec2",
		stencilIdPrefix: AWS_ICON_STENCIL_ID_PREFIX,
		catalog: awsIconCatalog,
		drawings: AWS_ICON_DRAWINGS,
	},
);
