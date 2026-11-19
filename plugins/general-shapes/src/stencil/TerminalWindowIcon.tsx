import { createStencilIcon } from "@jiscribe/canvas-sdk";

/**
 * The prompt sits in the body, at a size that survives 24px; the title bar the
 * shape has is left out to make room for it.
 */
export const TerminalWindowIcon = createStencilIcon(
	<>
		<path
			d="M3 5 H21 V19 H3 Z"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="round"
			strokeLinecap="round"
		/>
		<path
			d="M7 9.5 L10 12 L7 14.5"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="round"
			strokeLinecap="round"
		/>
		<path
			d="M12.5 15 H16.5"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="round"
			strokeLinecap="round"
		/>
	</>,
);
