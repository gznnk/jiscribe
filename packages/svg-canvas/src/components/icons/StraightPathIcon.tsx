import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Straight path icon component - shows a diagonal line from start to end point
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG stroke color
 * @param props.title - Accessible title for the icon
 * @returns SVG element for straight path icon
 */
const StraightPathIconComponent: React.FC<IconProps> = ({
	width = 24,
	height = 24,
	fill = "#333333",
	title,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			{/* Diagonal line from bottom-left to top-right */}
			<line
				x1="4"
				y1="18"
				x2="20"
				y2="6"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const StraightPathIcon = memo(StraightPathIconComponent);
