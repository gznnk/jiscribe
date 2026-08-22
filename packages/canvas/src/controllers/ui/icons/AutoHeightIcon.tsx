import { memo } from "react";

type AutoHeightIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Auto height icon.
 * A box with two text lines and a vertical double-headed arrow beside them:
 * the box's height is the lines' to decide.
 */
const AutoHeightIconComponent: React.FC<AutoHeightIconProps> = ({
	width = 22,
	height = 22,
	fill = "currentColor",
	title = "Auto Height",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 16 16"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
	>
		<title>{title}</title>
		{/* The box, dashed along the two edges the height moves */}
		<rect
			x="1.5"
			y="2.5"
			width="9"
			height="11"
			stroke={fill}
			strokeWidth="1.3"
			strokeDasharray="2.2 1.8"
			fill="none"
		/>
		{/* The text it holds */}
		<path
			d="M3.8 6.2 H8.2 M3.8 9 H8.2"
			stroke={fill}
			strokeWidth="1.3"
			strokeLinecap="round"
		/>
		{/* Vertical double-headed arrow */}
		<path
			d="M13.5 4 L13.5 12"
			stroke={fill}
			strokeWidth="1.3"
			strokeLinecap="round"
		/>
		<path d="M13.5 2 L15.4 5 L11.6 5 Z" fill={fill} />
		<path d="M13.5 14 L11.6 11 L15.4 11 Z" fill={fill} />
	</svg>
);

export const AutoHeightIcon = memo(AutoHeightIconComponent);
