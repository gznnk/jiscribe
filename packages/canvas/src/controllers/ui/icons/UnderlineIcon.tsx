import { memo } from "react";

type UnderlineIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Underline icon.
 * Displays the letter "U" over a baseline rule.
 */
const UnderlineIconComponent: React.FC<UnderlineIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title = "Underline",
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
			y="16"
			dominantBaseline="alphabetic"
			textAnchor="middle"
			fontFamily="Arial, Helvetica, sans-serif"
			fontSize="17"
			fill={fill}
		>
			U
		</text>
		<path
			d="M5 20 L19 20"
			stroke={fill}
			strokeWidth="2"
			strokeLinecap="round"
		/>
	</svg>
);

export const UnderlineIcon = memo(UnderlineIconComponent);
