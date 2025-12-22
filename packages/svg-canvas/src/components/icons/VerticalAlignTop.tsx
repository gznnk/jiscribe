import React, { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Vertical align top icon component
 * Shows a horizontal line at top with an upward arrow below
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG fill color (used for stroke and fill)
 * @param props.title - Accessible title for the icon
 * @returns SVG element for vertical align top icon
 */
const VerticalAlignTopComponent: React.FC<IconProps> = ({
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
			fill="none"
		>
			<title>{title}</title>
			{/* Top horizontal line */}
			<path
				d="M3 4 L21 4"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			{/* Vertical line (arrow shaft) */}
			<path
				d="M12 8 L12 20"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			{/* Upward arrow head (filled triangle) */}
			<path d="M12 7 L18 13 L6 13 Z" fill={fill} />
		</svg>
	);
};

export const VerticalAlignTop = memo(VerticalAlignTopComponent);
