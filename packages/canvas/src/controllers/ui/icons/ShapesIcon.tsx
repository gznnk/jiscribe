import { memo } from "react";

type ShapesIconProps = {
	width?: number;
	height?: number;
};

/**
 * Three shapes and a plus, the rail's button opening the catalog of every
 * library category: more shapes than the rail holds.
 *
 * Drawn for 24px with stroke-width 2: every straight segment (the square, the
 * triangle's base, the plus) sits on whole-number coordinates, so it covers
 * whole pixels. The circle stands over the plus's column.
 */
const ShapesIconComponent: React.FC<ShapesIconProps> = ({
	width = 24,
	height = 24,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect
				x="4"
				y="4"
				width="7"
				height="7"
				rx="1"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<circle cx="17" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="2" />
			<path
				d="M7 14 10 20H4l3-6Z"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
			<path
				d="M17 14v6M14 17h6"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const ShapesIcon = memo(ShapesIconComponent);
