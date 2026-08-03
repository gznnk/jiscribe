import type { ToolbarEntry } from "@workspace/canvas";

import { BraceIcon } from "./BraceIcon";

/**
 * Toolbar category entry for the annotation shapes. The annotation category is
 * not in the core default layout (plugin-supplied), so a host composes this into
 * its `toolbar.layout` where it wants the flyout to appear.
 *
 * The two boxes that stand on their own — rather than marking a run of other
 * shapes — lead, because they are what a user wanting to "write something on the
 * diagram" is after. The callout goes first of the pair: it was pinned straight
 * on the bar until it moved here, and its tail says which shape the comment is
 * about, which is the commoner want. The three group markers follow, from the
 * most expressive to the plainest, since a user who has got past the boxes is
 * usually after the marker that can point somewhere.
 */
export const annotationToolbarEntry: ToolbarEntry = {
	kind: "category",
	id: "annotation",
	label: { en: "Annotation", ja: "注釈" },
	icon: BraceIcon,
	presetIds: ["callout", "note", "brace", "bracketWithStem", "bracket"],
};
