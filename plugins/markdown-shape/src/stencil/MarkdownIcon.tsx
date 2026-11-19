import { createStencilIcon } from "@jiscribe/canvas-sdk";

/** The Markdown mark: an M and a down arrow in a wide box. */
export const MarkdownIcon = createStencilIcon(
	<>
		<rect
			x="2"
			y="5"
			width="20"
			height="14"
			rx="2"
			ry="2"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="round"
		/>
		<path
			d="M6 15 V9 L8.75 12 L11.5 9 V15"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round"
			strokeLinecap="round"
		/>
		<path
			d="M16.25 9 V15 M13.75 12.5 L16.25 15 L18.75 12.5"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round"
			strokeLinecap="round"
		/>
	</>,
);
