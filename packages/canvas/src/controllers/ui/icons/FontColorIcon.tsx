import { memo } from "react";

type FontColorIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	underlineColor?: string;
	title?: string;
};

/**
 * Font color icon.
 * Displays the letter "A" with a color bar underneath.
 */
const FontColorIconComponent: React.FC<FontColorIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	underlineColor = "currentColor",
	title = "Font Color",
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
			y="45%"
			dominantBaseline="central"
			textAnchor="middle"
			fontFamily="Arial, Helvetica, sans-serif"
			fontSize="20"
			fontWeight="500"
			fill={fill}
		>
			A
		</text>
		{/* underlineColor may be var(--jiscribe-*) (the resolved result of auto), so apply it via style. */}
		<rect
			x="4"
			y="20"
			width="16"
			height="2"
			rx="0.5"
			style={{ fill: underlineColor }}
		/>
	</svg>
);

export const FontColorIcon = memo(FontColorIconComponent);
