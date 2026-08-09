import type { ToolbarEntry } from "@jiscribe/canvas";

import { FrameIcon } from "./FrameIcon";

/**
 * Toolbar category entry for the container shapes. The container category is not
 * in the core default layout (plugin-supplied), so a host composes this into its
 * `toolbar.layout` where it wants the flyout to appear.
 */
export const containerToolbarEntry: ToolbarEntry = {
	kind: "category",
	id: "container",
	label: { en: "Container", ja: "コンテナ" },
	icon: FrameIcon,
	presetIds: ["frame", "boundary", "zone"],
};
