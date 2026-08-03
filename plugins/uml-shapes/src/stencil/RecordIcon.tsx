import { createStencilIcon } from "@workspace/canvas-sdk";

export const RecordIcon = createStencilIcon(
	<>
		<rect
			x="3"
			y="4"
			width="18"
			height="16"
			rx="1"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		/>
		<line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2" />
		<line
			x1="6"
			y1="13"
			x2="18"
			y2="13"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="6"
			y1="16.5"
			x2="14"
			y2="16.5"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
	</>,
);
