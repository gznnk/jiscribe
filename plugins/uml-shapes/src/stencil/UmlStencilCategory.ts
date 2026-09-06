import type { StencilCategory } from "@jiscribe/canvas";

import { RecordIcon } from "./RecordIcon";

/**
 * Stencil category for the UML shapes. The uml category is not in the core
 * default layout (plugin-supplied), so a host composes this into its
 * `stencilLibrary.sections` (a sidebar section) or, as a `{ kind: "category",
 * category }` entry, into its `toolbar.layout` (a flyout).
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
