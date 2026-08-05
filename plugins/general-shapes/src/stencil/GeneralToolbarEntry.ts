import type { ToolbarEntry } from "@workspace/canvas";

import { CloudIcon } from "./CloudIcon";

/**
 * Toolbar category entry for the general shapes. Entries reference presets by
 * string id, so every id resolves against whatever a host has applied — here all
 * of them come from this package's own stencils. The general category is not in
 * the core default layout, so a host composes this into its `toolbar.layout`
 * where it wants the flyout to appear.
 *
 * The order groups the flyout the way the shapes are reached for: who and where
 * first, then what runs, then what moves between them, then what guards it.
 */
export const generalToolbarEntry: ToolbarEntry = {
	kind: "category",
	id: "general",
	label: { en: "General", ja: "一般" },
	icon: CloudIcon,
	presetIds: [
		"actor",
		"cloud",
		"browserWindow",
		"terminalWindow",
		"smartphone",
		"laptop",
		"server",
		"gear",
		"package",
		"folder",
		"file",
		"envelope",
		"queue",
		"lock",
		"shield",
	],
};
