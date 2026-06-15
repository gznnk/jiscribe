import { memo } from "react";

type DashedLineIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Dashed line icon for stroke style selection.
 */
const DashedLineIconComponent: React.FC<DashedLineIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title = "Dashed line",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{title}</title>
		<line
			x1="1"
			y1="12"
			x2="23"
			y2="12"
			stroke={fill}
			strokeWidth="2"
			strokeDasharray="4,2"
		/>
	</svg>
);

export const DashedLineIcon = memo(DashedLineIconComponent);
