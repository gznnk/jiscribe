import type { StencilCategory } from "@jiscribe/canvas";

import { ErEntityIcon } from "./ErEntityIcon";

/**
 * Stencil category for the ER shapes. Not in core's default bar
 * (plugin-supplied), so a host composes this into its `stencilLibrary.sections`
 * (a sidebar section) or, as a `{ type: "stencilCategory", category }` item, into
 * its `toolbar.sections` (a flyout).
 */
export const erStencilCategory: StencilCategory = {
	id: "er",
	label: { en: "ER", ja: "ER" },
	icon: ErEntityIcon,
	presetIds: ["erEntity"],
};
