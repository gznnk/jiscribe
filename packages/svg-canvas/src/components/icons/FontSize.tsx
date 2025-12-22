import React, { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Font size icon component
 * Displays a large "T" and small "T" to represent font size control
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG fill color
 * @param props.title - Accessible title for the icon
 * @returns SVG element for font size icon
 */
const FontSizeComponent: React.FC<IconProps> = ({
	width = 24,
	height = 24,
	fill = "#333333",
	title,
}) => {
	return (
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
};

export const FontSize = memo(FontSizeComponent);
