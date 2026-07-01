import { memo } from "react";

type FontSizeIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Font size icon.
 * Displays a large "T" combined with a small "T".
 */
const FontSizeIconComponent: React.FC<FontSizeIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title = "Font Size",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{title}</title>
		{/* Large T */}
		<text
			x="3"
			y="21"
			fontFamily="Arial, sans-serif"
			fontSize="24"
			fontWeight="500"
			fill={fill}
		>
			T
		</text>
		{/* Small T */}
		<text
			x="15"
			y="21"
			fontFamily="Arial, sans-serif"
			fontSize="11"
			fontWeight="700"
			fill={fill}
		>
			T
		</text>
	</svg>
);

export const FontSizeIcon = memo(FontSizeIconComponent);
