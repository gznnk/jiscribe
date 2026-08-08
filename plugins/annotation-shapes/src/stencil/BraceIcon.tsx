import { createStencilIcon } from "@workspace/canvas-sdk";

/**
 * The default `left` brace at the stencil size. Hand-written rather than built
 * from buildBracePath, so the icon keeps its own optical margins as the path
 * construction changes.
 */
export const BraceIcon = createStencilIcon(
	<path
		d="M17 2 Q12 2 12 7 Q12 12 7 12 Q12 12 12 17 Q12 22 17 22"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
	/>,
);
