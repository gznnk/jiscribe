import type { StencilCategory } from "@jiscribe/canvas";

import { CloudIcon } from "./CloudIcon";

/**
 * Stencil category for the general shapes. Entries reference presets by
 * string id, so every id resolves against whatever a host has applied — here all
 * of them come from this package's own stencils. The general category is not in
 * core's default bar, so a host composes this into its
 * `stencilLibrary.sections` (a sidebar section) or, as a `{ type: "stencilCategory",
 * category }` item, into its `toolbar.sections` (a flyout).
 *
 * The order groups the flyout the way the shapes are reached for: who and where
 * first, then what runs, then what moves between them, then what guards it.
 */
export const generalStencilCategory: StencilCategory = {
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
