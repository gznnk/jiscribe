import { memo } from "react";

type FontFamilyIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Font family icon.
 * Displays a single serif "A", the convention for a typeface across icon sets.
 * One letter rather than two of different sizes, which is what the neighbouring
 * FontSizeIcon means; the serif cut against the sans-serif UI is what carries
 * "typeface" here.
 */
const FontFamilyIconComponent: React.FC<FontFamilyIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title = "Font",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{title}</title>
		<text
			x="12"
			y="20"
			textAnchor="middle"
			fontFamily="Georgia, 'Times New Roman', serif"
			fontSize="22"
			fontWeight="500"
			fill={fill}
		>
			A
		</text>
	</svg>
);

export const FontFamilyIcon = memo(FontFamilyIconComponent);
