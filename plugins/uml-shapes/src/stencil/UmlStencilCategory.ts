import type { StencilCategory } from "@jiscribe/canvas";

import { RecordIcon } from "./RecordIcon";

/**
 * Stencil category for the UML shapes. Plugin-supplied, so a host composes
 * this into its `stencilLibrary.sections`, where the rail's catalog lists it
 * and the user can pin it to the rail.
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
