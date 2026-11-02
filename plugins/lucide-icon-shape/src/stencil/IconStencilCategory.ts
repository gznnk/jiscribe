import type { StencilCategory } from "@jiscribe/canvas";

import { createLucideStencilIcon } from "./createLucideStencilIcon";
import { listIconBrowseGroups } from "./iconBrowseGroups";
import { ICON_STENCIL_IDS } from "./IconStencils";
import { toIconStencilId } from "./toIconStencilId";
import { searchIconNames } from "../schema/icon/searchIconNames";

/**
 * Stencil category for the icon shape. Not in core's default bar, so a host
 * composes it into its `stencilLibrary.sections` (a sidebar section) or, as a
 * `{ type: "stencilCategory", category }` item, into its `toolbar.sections` (a flyout).
 *
 * A category rather than a single pinned preset: the shape is only useful once an icon is
 * chosen, and a placed shape offers no menu to change it. The flyout's handful is listed up
 * front; the shape library's "show all" view holds the whole set in sections, one per
 * lucide category (iconBrowseGroups.ts).
 */
export const lucideIconStencilCategory: StencilCategory = {
	id: "icon",
	label: { en: "Icon", ja: "アイコン" },
	icon: createLucideStencilIcon("face-slightly-smiling"),
	presetIds: [...ICON_STENCIL_IDS],
	search: (query) => {
		const { names, total } = searchIconNames(query);
		return { presetIds: names.map(toIconStencilId), matchCount: total };
	},
	browseGroups: listIconBrowseGroups(),
};
