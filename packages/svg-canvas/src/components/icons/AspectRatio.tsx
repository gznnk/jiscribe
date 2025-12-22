import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Aspect ratio icon component
 * Shows a rectangle with a diagonal arrow from top-left to bottom-right with open arrows at both ends
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG fill color (used for stroke)
 * @param props.title - Accessible title for the icon
 * @returns SVG element for aspect ratio icon
 */
const AspectRatioComponent: React.FC<IconProps> = ({
	width = 24,
	height = 24,
	fill = "#333333",
	title,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 16 16"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
		>
			<title>{title}</title>
			{/* Outer rectangle */}
			<rect
				x="1.5"
				y="1.5"
				width="13"
				height="13"
				stroke={fill}
				strokeWidth="1.3"
				fill="none"
			/>
			{/* Diagonal arrow line from top-left to bottom-right */}
			<path
				d="M5.5 5.5 L10.5 10.5"
				stroke={fill}
				strokeWidth="1.3"
				strokeLinecap="round"
			/>
			{/* Top-left arrow head (filled triangle pointing to bottom-right) */}
			<path d="M3 3 L7.5 3 L3 7.5 Z" fill={fill} />
			{/* Bottom-right arrow head (filled triangle pointing to bottom-right) */}
			<path d="M13 13 L8.5 13 L13 8.5 Z" fill={fill} />
		</svg>
	);
};

export const AspectRatio = memo(AspectRatioComponent);
