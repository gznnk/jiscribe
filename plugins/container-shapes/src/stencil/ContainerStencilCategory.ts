import type { StencilCategory } from "@jiscribe/canvas";

import { FrameIcon } from "./FrameIcon";

/**
 * Stencil category for the container shapes. The container category is not
 * in the core default layout (plugin-supplied), so a host composes this into its
 * `stencilLibrary.sections` (a sidebar section) or, as a `{ kind: "category",
 * category }` entry, into its `toolbar.layout` (a flyout).
 */
export const containerStencilCategory: StencilCategory = {
	id: "container",
	label: { en: "Container", ja: "コンテナ" },
	icon: FrameIcon,
	presetIds: ["frame", "boundary", "zone"],
};
