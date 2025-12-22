import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Right alignment icon component
 * Shows 4 horizontal lines representing right-aligned text (2 full-width, 2 half-width)
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG fill color (used for stroke)
 * @param props.title - Accessible title for the icon
 * @returns SVG element for right alignment icon
 */
const AlignRightComponent: React.FC<IconProps> = ({
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
			{/* Line 1: Full width */}
			<path
				d="M3 6 L21 6"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			{/* Line 2: Half width (right aligned) */}
			<path
				d="M10 10 L21 10"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			{/* Line 3: Full width */}
			<path
				d="M3 14 L21 14"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			{/* Line 4: Half width (right aligned) */}
			<path
				d="M10 18 L21 18"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const AlignRight = memo(AlignRightComponent);
