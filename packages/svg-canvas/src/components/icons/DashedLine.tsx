import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Dashed line icon component
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG stroke color
 * @param props.title - Accessible title for the icon
 * @returns SVG element for dashed line icon
 */
const DashedLineComponent: React.FC<IconProps> = ({
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
			<line
				x1="1"
				y1="12"
				x2="23"
				y2="12"
				stroke={fill}
				strokeWidth="2"
				strokeDasharray="4,2"
			/>
		</svg>
	);
};

export const DashedLine = memo(DashedLineComponent);
