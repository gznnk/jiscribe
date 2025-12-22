import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Rounded path icon component - shows zigzag path with rounded corners
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG stroke color
 * @param props.title - Accessible title for the icon
 * @returns SVG element for rounded path icon
 */
const RoundedPathIconComponent: React.FC<IconProps> = ({
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
			{/* Zigzag path: bottom-left → bottom-center → top-center → top-right with rounded corners */}
			<path
				d="M 4,18 L 8,18 Q 12,18 12,14 L 12,10 Q 12,6 16,6 L 20,6"
				stroke={fill}
				strokeWidth="2"
				fill="none"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const RoundedPathIcon = memo(RoundedPathIconComponent);
