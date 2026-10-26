import type { StencilCategory } from "@jiscribe/canvas";

import { FrameIcon } from "./FrameIcon";

/**
 * Stencil category for the container shapes. Plugin-supplied, so a host
 * composes this into its `stencilLibrary.sections`, where the rail's catalog
 * lists it and the user can pin it to the rail.
 */
export const containerStencilCategory: StencilCategory = {
	id: "container",
	label: { en: "Container", ja: "コンテナ" },
	icon: FrameIcon,
	presetIds: ["frame", "boundary", "zone"],
};
