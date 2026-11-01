import type { StencilCategory } from "@jiscribe/canvas";

import { AWS_ICON_STENCIL_IDS } from "./AwsIconStencils";
import { createAwsStencilIcon } from "./createAwsStencilIcon";
import { toAwsIconStencilId } from "./toAwsIconStencilId";
import { listAwsIconBrowseGroups } from "../schema/icon/awsIconBrowseGroups";
import { searchAwsIcons } from "../schema/icon/searchAwsIcons";

/**
 * The awsIcon category. Core's default bar does not carry it, so a host puts
 * it into `stencilLibrary.sections` (a sidebar section) or into
 * `toolbar.sections` as `{ type: "stencilCategory", category }` (a flyout).
 *
 * A category rather than a single preset because the shape means nothing until
 * an icon is chosen, and a placed shape offers no menu to change it. The
 * palette is listed up front; the shape library's "show all" view holds the
 * whole set.
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
	browseGroups: listAwsIconBrowseGroups().map(({ id, label, names }) => ({
		id,
		label,
		presetIds: names.map(toAwsIconStencilId),
	})),
};
