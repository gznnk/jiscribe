import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Polyline path icon component - shows a zigzag line connecting multiple points
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG stroke color
 * @param props.title - Accessible title for the icon
 * @returns SVG element for polyline path icon
 */
const PolylinePathIconComponent: React.FC<IconProps> = ({
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
			{/* Zigzag polyline: bottom-left → bottom-center → top-center → top-right with sharp corners */}
			<polyline
				points="4,18 12,18 12,6 20,6"
				stroke={fill}
				strokeWidth="2"
				fill="none"
				strokeLinejoin="miter"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const PolylinePathIcon = memo(PolylinePathIconComponent);
