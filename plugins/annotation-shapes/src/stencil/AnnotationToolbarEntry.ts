import type { ToolbarEntry } from "@workspace/canvas";

import { BraceIcon } from "./BraceIcon";

/**
 * Toolbar category entry for the annotation shapes. The annotation category is
 * not in the core default layout (plugin-supplied), so a host composes this into
 * its `toolbar.layout` where it wants the flyout to appear.
 *
 * The order runs from the most expressive marker to the plainest, since a user
 * reaching for the category is usually after the one that can point somewhere.
 */
export const annotationToolbarEntry: ToolbarEntry = {
	kind: "category",
	id: "annotation",
	label: { en: "Annotation", ja: "注釈" },
	icon: BraceIcon,
	presetIds: ["brace", "bracketWithStem", "bracket"],
};
