import type { StencilCategory } from "@jiscribe/canvas";

import { createLucideStencilIcon } from "./createLucideStencilIcon";
import { ICON_STENCIL_IDS } from "./IconStencils";

/**
 * Stencil category for the icon shape. Not in the core default layout, so a host
 * composes it into its `stencilLibrary.sections` (a sidebar section) or, as a
 * `{ kind: "category", category }` entry, into its `toolbar.layout` (a flyout).
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
};
