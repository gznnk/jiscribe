import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Border icon component
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG fill color
 * @returns SVG element for border icon
 */
const BorderComponent: React.FC<IconProps> = ({
	fill = "#333333",
	width = 24,
	height = 24,
	title,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 1024 1024"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title || "Border"}</title>
			<path
				d="M880 112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c0-17.7-14.3-32-32-32zm-40 728H184V184h656v656z"
				fill={fill}
			/>
		</svg>
	);
};

export const Border = memo(BorderComponent);
