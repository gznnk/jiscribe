import { createStencilIcon } from "@jiscribe/canvas-sdk";

export const StickyIcon = createStencilIcon(
	<>
		<path
			d="M4 3 L15 3 L21 9 L21 21 L4 21 Z"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinejoin="round"
		/>
		<path
			d="M15 3 L15 9 L21 9"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinejoin="round"
		/>
	</>,
);
