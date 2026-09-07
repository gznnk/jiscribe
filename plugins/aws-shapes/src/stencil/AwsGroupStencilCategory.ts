import type { StencilCategory } from "@jiscribe/canvas";

import { AWS_GROUP_STENCIL_IDS } from "./AwsGroupStencils";
import { createAwsStencilIcon } from "./createAwsStencilIcon";

/**
 * The awsGroup category, kept a section apart from the icons: the frames are a
 * diagram's skeleton and the icons are what goes in it, which are two different
 * things to be looking for. A host mounts it the way it mounts
 * {@link import("./AwsIconStencilCategory").awsStencilCategory}.
 */
export const awsGroupStencilCategory: StencilCategory = {
	id: "aws-group",
	label: { en: "AWS Groups", ja: "AWS グループ" },
	icon: createAwsStencilIcon("group/virtual-private-cloud-vpc"),
	presetIds: [...AWS_GROUP_STENCIL_IDS],
};
