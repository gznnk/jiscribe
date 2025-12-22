import React, { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Minus icon component
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG fill color
 * @param props.title - Accessible title for the icon
 * @returns SVG element for minus icon
 */
const MinusComponent: React.FC<IconProps> = ({
	width = 24,
	height = 24,
	fill = "#333333",
	title,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 1024 1024"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<path
				d="M872 474H152c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h720c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8z"
				fill={fill}
			/>
		</svg>
	);
};

export const Minus = memo(MinusComponent);
