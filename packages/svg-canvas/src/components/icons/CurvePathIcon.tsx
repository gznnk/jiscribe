import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Curve path icon component - shows a smooth curved line with a pronounced bend
 * that is point-symmetric around the center
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG stroke color
 * @param props.title - Accessible title for the icon
 * @returns SVG element for curve path icon
 */
const CurvePathIconComponent: React.FC<IconProps> = ({
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
			{/* Smooth curved path with central point symmetry */}
			<path
				d="M4 18 C6 14 10 12 12 12 C14 12 18 10 20 6"
				stroke={fill}
				strokeWidth="2"
				fill="none"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const CurvePathIcon = memo(CurvePathIconComponent);
