import { createStencilIcon } from "@jiscribe/canvas-sdk";

/**
 * The package: the tabbed silhouette, with the line closing the body's top edge
 * under the tab — the same two pieces the shape itself is drawn from
 * (UmlPackageBox), at the proportions of a 24x24 box.
 */
export const UmlPackageIcon = createStencilIcon(
	<>
		<path
			d="M 3 3 H 10 V 7 H 21 V 21 H 3 Z"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="round"
		/>
		<line x1="3" y1="7" x2="10" y2="7" stroke="currentColor" strokeWidth="2" />
	</>,
);
