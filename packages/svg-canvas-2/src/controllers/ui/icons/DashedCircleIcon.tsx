import { memo } from "react";

type DashedCircleIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Dashed circle icon for border style menu.
 */
const DashedCircleIconComponent: React.FC<DashedCircleIconProps> = ({
	width = 24,
	height = 24,
	fill = "#333333",
	title = "Border Style",
}) => (
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

export const DashedCircleIcon = memo(DashedCircleIconComponent);
