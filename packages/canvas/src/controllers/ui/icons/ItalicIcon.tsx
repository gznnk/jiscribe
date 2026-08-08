import { memo } from "react";

type ItalicIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Italic icon.
 * Displays the letter "I" slanted.
 */
const ItalicIconComponent: React.FC<ItalicIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title = "Italic",
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
			fontFamily="Georgia, 'Times New Roman', serif"
			fontSize="22"
			fontStyle="italic"
			fill={fill}
		>
			I
		</text>
	</svg>
);

export const ItalicIcon = memo(ItalicIconComponent);
