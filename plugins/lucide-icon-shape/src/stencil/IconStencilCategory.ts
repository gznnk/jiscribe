import type { StencilCategory } from "@jiscribe/canvas";

import { createLucideStencilIcon } from "./createLucideStencilIcon";
import { ICON_STENCIL_IDS } from "./IconStencils";
import { toIconStencilId } from "./toIconStencilId";
import { searchIconNames } from "../schema/icon/searchIconNames";

/**
 * Stencil category for the icon shape. Plugin-supplied, so a host composes it
 * into its `stencilLibrary.sections`, where the rail's catalog lists it and the
 * user can pin it to the rail.
 *
 * A category rather than a single pinned preset: the shape is only useful once an icon is
 * chosen, and placing one that always says "star" would make choosing a second step every
 * single time.
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
};
