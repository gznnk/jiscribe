import { createStencilIcon } from "@workspace/canvas-sdk";

/**
 * The default `left` bracket at the stencil size. Hand-written rather than built
 * from buildBracketPath, so the icon keeps its own optical margins as the path
 * construction changes.
 */
export const BracketIcon = createStencilIcon(
	<path
		d="M17 2 L7 2 L7 22 L17 22"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
	/>,
);
