import type { StencilCategory } from "@jiscribe/canvas";

import { createLucideStencilIcon } from "./createLucideStencilIcon";
import { ICON_STENCIL_IDS } from "./IconStencils";

/**
 * Stencil category for the icon shape. Not in core's default bar, so a host
 * composes it into its `stencilLibrary.sections` (a sidebar section) or, as a
 * `{ type: "stencilCategory", category }` item, into its `toolbar.sections` (a flyout).
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
