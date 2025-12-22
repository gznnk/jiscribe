import React, { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Group icon component
 * Shows an outer frame with two overlapping squares inside representing grouped items
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG fill color (used for stroke)
 * @param props.title - Accessible title for the icon
 * @returns SVG element for group icon
 */
const GroupComponent: React.FC<IconProps> = ({
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
			{/* Outer frame */}
			<rect
				x="3"
				y="3"
				width="18"
				height="18"
				stroke={fill}
				strokeWidth="2"
				fill="none"
			/>
			{/* Corner squares */}
			{/* Top-left corner */}
			<rect x="1" y="1" width="3" height="3" fill={fill} />
			{/* Top-right corner */}
			<rect x="20" y="1" width="3" height="3" fill={fill} />
			{/* Bottom-left corner */}
			<rect x="1" y="20" width="3" height="3" fill={fill} />
			{/* Bottom-right corner */}
			<rect x="20" y="20" width="3" height="3" fill={fill} />
			{/* Back square (filled white to show layering) */}
			<rect
				x="7"
				y="10"
				width="7"
				height="7"
				stroke={fill}
				strokeWidth="2"
				fill="white"
			/>
			{/* Front square */}
			<rect
				x="10"
				y="7"
				width="7"
				height="7"
				stroke={fill}
				strokeWidth="2"
				fill="white"
			/>
		</svg>
	);
};

export const Group = memo(GroupComponent);
