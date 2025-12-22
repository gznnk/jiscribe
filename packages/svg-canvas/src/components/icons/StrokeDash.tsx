import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * StrokeDash icon component for stroke dash type selection
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG fill color
 * @returns SVG element for stroke dash icon
 */
const StrokeDashComponent: React.FC<IconProps> = ({
	fill = "#333333",
	width = 24,
	height = 24,
	title,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title || "Stroke Dash"}</title>
			<line
				x1="2"
				y1="12"
				x2="22"
				y2="12"
				stroke={fill}
				strokeWidth="2"
				strokeDasharray="4,2"
			/>
		</svg>
	);
};

export const StrokeDash = memo(StrokeDashComponent);
