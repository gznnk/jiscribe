import { createStencilIcon } from "@jiscribe/canvas-sdk";

/**
 * The component: the notation's own symbol, the small box with two tabs on its
 * left edge, filling the 24x24 icon box.
 *
 * Drawn as one notched outline rather than as the three rectangles the shape uses
 * (buildUmlComponentIconPaths): a palette glyph is unfilled, so the fill that
 * hides the tabs' crossings there would show them here.
 */
export const UmlComponentIcon = createStencilIcon(
	<path
		d="M 7 3 H 21 V 21 H 7 V 18 H 3 V 14 H 7 V 10 H 3 V 6 H 7 Z"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinejoin="round"
	/>,
);
