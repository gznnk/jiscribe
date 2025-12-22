import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Bold text formatting icon component
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG fill color
 * @param props.title - Accessible title for the icon
 * @returns SVG element for bold text formatting icon
 */
const BoldComponent: React.FC<IconProps> = ({
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
			<text
				x="50%"
				y="50%"
				dominantBaseline="central"
				textAnchor="middle"
				fontFamily="Arial, Helvetica, sans-serif"
				fontSize="22"
				fontWeight="600"
				fill={fill}
			>
				B
			</text>
		</svg>
	);
};

export const Bold = memo(BoldComponent);
