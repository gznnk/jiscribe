import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Dashed circle icon component
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG stroke color
 * @param props.title - Accessible title for the icon
 * @returns SVG element for dashed circle icon
 */
const DashedCircleComponent: React.FC<IconProps> = ({
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
			<circle
				cx="12"
				cy="12"
				r="9"
				fill="none"
				stroke={fill}
				strokeWidth="2"
				strokeDasharray="4,3"
			/>
		</svg>
	);
};

export const DashedCircle = memo(DashedCircleComponent);
