import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Stack order icon component - represents layering and z-index control
 * Shows three stacked layers to represent order management
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG fill color (used for stroke)
 * @param props.title - Accessible title for the icon
 * @returns SVG element for stack order icon
 */
const StackOrderComponent: React.FC<IconProps> = ({
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
			stroke={fill}
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.3"
		>
			<title>{title}</title>
			{/* Three stacked layers */}
			<path d="m1.75 11 6.25 3.25 6.25-3.25m-12.5-3 6.25 3.25 6.25-3.25m-6.25-6.25-6.25 3.25 6.25 3.25 6.25-3.25z" />
		</svg>
	);
};

export const StackOrder = memo(StackOrderComponent);
