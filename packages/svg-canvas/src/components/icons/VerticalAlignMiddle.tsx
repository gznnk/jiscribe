import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Vertical align middle icon component
 * Shows a horizontal line at middle with upward and downward arrows
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG fill color (used for stroke and fill)
 * @param props.title - Accessible title for the icon
 * @returns SVG element for vertical align middle icon
 */
const VerticalAlignMiddleComponent: React.FC<IconProps> = ({
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
			{/* Middle horizontal line */}
			<path
				d="M3 12 L21 12"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			{/* Top vertical line (upper arrow shaft) */}
			<path
				d="M12 0 L12 8"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			{/* Bottom vertical line (lower arrow shaft) */}
			<path
				d="M12 16 L12 24"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			{/* Downward arrow head at top (filled triangle) */}
			<path d="M12 10 L6 4 L18 4 Z" fill={fill} />
			{/* Upward arrow head at bottom (filled triangle) */}
			<path d="M12 14 L6 20 L18 20 Z" fill={fill} />
		</svg>
	);
};

export const VerticalAlignMiddle = memo(VerticalAlignMiddleComponent);
