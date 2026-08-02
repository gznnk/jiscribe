import type { ToolbarEntry } from "@workspace/canvas";

import { CloudIcon } from "./CloudIcon";

/**
 * Toolbar category entry for the general shapes. It lists `cloud` — still a core
 * preset — alongside this package's `actor`, because entries reference presets by
 * string id and the category, not the package, is what the id set follows. The
 * general category is no longer in the core default layout, so a host composes
 * this into its `toolbar.layout` where it wants the flyout to appear.
 */
export const generalToolbarEntry: ToolbarEntry = {
	kind: "category",
	id: "general",
	label: { en: "General", ja: "一般" },
	icon: CloudIcon,
	presetIds: ["cloud", "actor"],
};
