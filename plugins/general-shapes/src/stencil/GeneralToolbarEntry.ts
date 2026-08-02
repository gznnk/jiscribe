import type { ToolbarEntry } from "@workspace/canvas";

import { CloudIcon } from "./CloudIcon";

/**
 * Toolbar category entry for the general shapes. Entries reference presets by
 * string id, so both ids resolve against whatever a host has applied — here both
 * come from this package's own stencils. The general category is not in the core
 * default layout, so a host composes this into its `toolbar.layout` where it
 * wants the flyout to appear.
 */
export const generalToolbarEntry: ToolbarEntry = {
	kind: "category",
	id: "general",
	label: { en: "General", ja: "一般" },
	icon: CloudIcon,
	presetIds: ["cloud", "actor"],
};
