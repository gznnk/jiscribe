import type { StencilCategory } from "@jiscribe/canvas";

import { RecordIcon } from "./RecordIcon";

/**
 * Stencil category for the UML shapes. The uml category is not in core's
 * default bar (plugin-supplied), so a host composes this into its
 * `stencilLibrary.sections` (a sidebar section) or, as a `{ type: "stencilCategory",
 * category }` item, into its `toolbar.sections` (a flyout).
 */
export const umlStencilCategory: StencilCategory = {
	id: "uml",
	label: { en: "UML", ja: "UML" },
	icon: RecordIcon,
	presetIds: [
		"object",
		"class",
		"interface",
		"abstractClass",
		"enum",
		// The two single-preset types, after the record presets: they are whole
		// shapes rather than variants of one box (see createTypeStencils).
		"umlPackage",
		"umlComponent",
	],
};
