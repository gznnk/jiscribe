import { createStencilIcon } from "@workspace/canvas-sdk";

/**
 * The default `left` bracket with its stem at the stencil size. Hand-written
 * rather than built from buildBracketWithStemPath, so the icon keeps its own
 * optical margins as the path construction changes.
 */
export const BracketWithStemIcon = createStencilIcon(
	<path
		d="M17 2 L12 2 L12 22 L17 22 M12 12 L7 12"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
	/>,
);
