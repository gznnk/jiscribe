import React, { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * TextArea icon component
 */
const TextAreaComponent: React.FC<IconProps> = ({
	width = 24,
	height = 24,
	fill = "#000000",
	title = "TextArea",
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>{title}</title>
			<rect
				x="1"
				y="1"
				width="22"
				height="22"
				rx="2"
				fill="none"
				stroke={fill}
				strokeWidth="2"
				strokeLinejoin="round"
			/>
			<path
				d="M5 7H19M5 12H19M5 17H15"
				fill="none"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export const TextArea = memo(TextAreaComponent);
