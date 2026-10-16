import type { StencilCategory } from "@jiscribe/canvas";

import { AWS_ICON_STENCIL_IDS } from "./AwsIconStencils";
import { createAwsStencilIcon } from "./createAwsStencilIcon";
import { toAwsIconStencilId } from "./toAwsIconStencilId";
import { searchAwsIcons } from "../schema/icon/searchAwsIcons";

/**
 * The awsIcon category. Core's default bar does not carry it, so a host puts
 * it into `stencilLibrary.sections` (a sidebar section) or into
 * `toolbar.sections` as `{ type: "stencilCategory", category }` (a flyout).
 *
 * A category rather than a single preset because the shape means nothing until
 * an icon is chosen: always placing an EC2 would add a step to every use.
 */
export const awsStencilCategory: StencilCategory = {
	id: "aws",
	label: { en: "AWS", ja: "AWS" },
	icon: createAwsStencilIcon("service/amazon-ec2"),
	presetIds: [...AWS_ICON_STENCIL_IDS],
	search: (query) => {
		const { names, total } = searchAwsIcons({ query });
		return { presetIds: names.map(toAwsIconStencilId), matchCount: total };
	},
};
