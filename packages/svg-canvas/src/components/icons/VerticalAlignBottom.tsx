import React, { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Vertical align bottom icon component
 * Shows a horizontal line at bottom with a downward arrow above
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG fill color (used for stroke and fill)
 * @param props.title - Accessible title for the icon
 * @returns SVG element for vertical align bottom icon
 */
const VerticalAlignBottomComponent: React.FC<IconProps> = ({
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
			{/* Bottom horizontal line */}
			<path
				d="M3 20 L21 20"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			{/* Vertical line (arrow shaft) */}
			<path
				d="M12 4 L12 16"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			{/* Downward arrow head (filled triangle) */}
			<path d="M12 17 L18 11 L6 11 Z" fill={fill} />
		</svg>
	);
};

export const VerticalAlignBottom = memo(VerticalAlignBottomComponent);
