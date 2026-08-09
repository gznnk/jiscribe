import { createStencilIcon } from "@jiscribe/canvas-sdk";

export const ZoneIcon = createStencilIcon(
	<>
		<rect
			x="3"
			y="4"
			width="18"
			height="16"
			rx="1"
			fill="currentColor"
			fillOpacity="0.15"
			stroke="currentColor"
			strokeWidth="2"
		/>
		<line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2" />
	</>,
);
