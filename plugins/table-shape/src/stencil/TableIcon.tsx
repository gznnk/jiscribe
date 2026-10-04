import { createStencilIcon } from "@jiscribe/canvas-sdk";

/**
 * A grid: the outline at the frame weight the other shapes' icons use, and the
 * inner rules a step lighter, so the palette reads the shape as a table rather
 * than as a divided box.
 */
export const TableIcon = createStencilIcon(
	<>
		<rect
			x="3"
			y="3"
			width="18"
			height="18"
			rx="1"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		/>
		<line
			x1="9"
			y1="3"
			x2="9"
			y2="21"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="15"
			y1="3"
			x2="15"
			y2="21"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="3"
			y1="9"
			x2="21"
			y2="9"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
		<line
			x1="3"
			y1="15"
			x2="21"
			y2="15"
			stroke="currentColor"
			strokeWidth="1.5"
		/>
	</>,
);
