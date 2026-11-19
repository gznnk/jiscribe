import { createStencilIcon } from "@jiscribe/canvas-sdk";

/**
 * The dash period (4.5) divides both sides (18 and 13.5), and the offset of half
 * a dash centers one on every corner.
 */
export const BoundaryIcon = createStencilIcon(
	<path
		d="M3 5.25 H21 V18.75 H3 Z"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinejoin="round"
		strokeDasharray="2.7 1.8"
		strokeDashoffset="1.35"
	/>,
);
