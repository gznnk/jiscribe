import type { ToolbarEntry } from "@jiscribe/canvas";

import { RecordIcon } from "./RecordIcon";

/**
 * Toolbar category entry for the UML shapes. The uml category is not in the core
 * default layout (plugin-supplied), so a host composes this into its
 * `toolbar.layout` where it wants the flyout to appear.
 */
export const umlToolbarEntry: ToolbarEntry = {
	kind: "category",
	id: "uml",
	label: { en: "UML", ja: "UML" },
	icon: RecordIcon,
	presetIds: ["object", "class", "interface", "abstractClass", "enum"],
};
