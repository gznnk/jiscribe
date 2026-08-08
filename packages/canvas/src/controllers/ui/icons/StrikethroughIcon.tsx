import { memo } from "react";

type StrikethroughIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Strikethrough icon.
 * Displays the letter "S" crossed by a rule.
 */
const StrikethroughIconComponent: React.FC<StrikethroughIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title = "Strikethrough",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{title}</title>
		<text
			x="50%"
			y="50%"
			dominantBaseline="central"
			textAnchor="middle"
			fontFamily="Arial, Helvetica, sans-serif"
			fontSize="17"
			fill={fill}
		>
			S
		</text>
		<path
			d="M4 12 L20 12"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
	</svg>
);

export const StrikethroughIcon = memo(StrikethroughIconComponent);
