import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Font color icon component
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG fill color
 * @param props.title - Accessible title for the icon
 * @returns SVG element for font color icon
 */
const FontColorComponent: React.FC<IconProps> = ({
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
				y="45%"
				dominantBaseline="central"
				textAnchor="middle"
				fontFamily="Arial, Helvetica, sans-serif"
				fontSize="20"
				fontWeight="500"
				fill={fill}
			>
				A
			</text>
			<rect x="4" y="20" width="16" height="2" fill={fill} rx="0.5" />
		</svg>
	);
};

export const FontColor = memo(FontColorComponent);
