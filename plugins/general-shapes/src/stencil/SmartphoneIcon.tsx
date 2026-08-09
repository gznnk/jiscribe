import { createStencilIcon } from "@jiscribe/canvas-sdk";

/**
 * The radii follow the shape's own ratios: SMARTPHONE_CORNER_RATIO (0.13) of the
 * shorter side for the case, SMARTPHONE_SCREEN_CORNER_RATIO (0.4) of that for the
 * screen. Any larger and the 1px bezel between the two frames closes up at 24px.
 */
export const SmartphoneIcon = createStencilIcon(
	<>
		<rect
			x="5"
			y="2"
			width="14"
			height="20"
			rx="2"
			ry="2"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="round"
		/>
		<rect
			x="8"
			y="5"
			width="8"
			height="14"
			rx="0.8"
			ry="0.8"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinejoin="round"
		/>
	</>,
);
