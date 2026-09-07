import type { StencilCategory } from "@jiscribe/canvas";

import { AWS_ICON_STENCIL_IDS } from "./AwsIconStencils";
import { createAwsStencilIcon } from "./createAwsStencilIcon";

/**
 * The awsIcon category. Core's default layout does not carry it, so a host puts
 * it into `stencilLibrary.sections` (a sidebar section) or into `toolbar.layout`
 * as `{ kind: "category", category }` (a flyout).
 *
 * A category rather than a single preset because the shape means nothing until
 * an icon is chosen: always placing an EC2 would add a step to every use.
 */
export const awsStencilCategory: StencilCategory = {
	id: "aws",
	label: { en: "AWS", ja: "AWS" },
	icon: createAwsStencilIcon("service/amazon-ec2"),
	presetIds: [...AWS_ICON_STENCIL_IDS],
};
