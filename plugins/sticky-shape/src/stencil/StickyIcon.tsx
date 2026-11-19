import { createStencilIcon } from "@jiscribe/canvas-sdk";

/**
 * A square sheet with its bottom-right corner turned up, which keeps it apart
 * from the file and note glyphs that fold at the top.
 */
export const StickyIcon = createStencilIcon(
	<>
		<path
			d="M4 4 H20 V14 L14 20 H4 Z"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="round"
			strokeLinecap="round"
		/>
		<path
			d="M20 14 H14 V20"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="round"
			strokeLinecap="round"
		/>
	</>,
);
