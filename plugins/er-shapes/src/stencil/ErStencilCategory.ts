import type { StencilCategory } from "@jiscribe/canvas";

import { ErEntityIcon } from "./ErEntityIcon";

/**
 * Stencil category for the ER shapes. Plugin-supplied, so a host composes this
 * into its `stencilLibrary.sections`, where the rail's catalog lists it and the
 * user can pin it to the rail.
 */
export const erStencilCategory: StencilCategory = {
	id: "er",
	label: { en: "ER", ja: "ER" },
	icon: ErEntityIcon,
	presetIds: ["erEntity"],
};
