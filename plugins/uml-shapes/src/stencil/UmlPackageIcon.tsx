import { createStencilIcon } from "@jiscribe/canvas-sdk";

/**
 * The package: the tabbed silhouette, with the line closing the body's top edge
 * under the tab — the same two pieces the shape itself is drawn from
 * (UmlPackageBox), at the proportions of a 24x24 box.
 */
export const UmlPackageIcon = createStencilIcon(
	<>
		<path
			d="M 3 4 H 10 V 8 H 21 V 20 H 3 Z"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="round"
		/>
		<line x1="3" y1="8" x2="10" y2="8" stroke="currentColor" strokeWidth="2" />
	</>,
);
