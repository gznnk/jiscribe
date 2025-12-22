import type React from "react";

export type LineStyleProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * LineStyle icon component
 * Shows three different line styles: thick solid, dashed, and curved
 */
const LineStyleComponent: React.FC<LineStyleProps> = ({
	width = 24,
	height = 24,
	fill = "#333333",
	title,
}) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={width}
			height={height}
			viewBox="0 0 24 24"
			fill="none"
		>
			{title && <title>{title}</title>}
			{/* Solid line */}
			<line
				x1="4"
				y1="6"
				x2="20"
				y2="6"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
			/>
			{/* Dashed line */}
			<line
				x1="4"
				y1="12"
				x2="20"
				y2="12"
				stroke={fill}
				strokeWidth="2"
				strokeDasharray="3,3"
				strokeLinecap="round"
			/>
			{/* Curved line */}
			<path
				d="M4 19 Q12 15 20 19"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
				fill="none"
			/>
		</svg>
	);
};

export const LineStyle = LineStyleComponent;
