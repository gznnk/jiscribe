import React, { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * LLM icon component - represents a brain with neural connections
 *
 * @param props - Props for the icon
 * @param props.width - Icon width
 * @param props.height - Icon height
 * @param props.fill - SVG fill color
 * @param props.title - Accessible title for the icon
 * @returns SVG element for LLM brain icon
 */
const LLMComponent: React.FC<IconProps> = ({
	width = 24,
	height = 24,
	fill = "#000000",
	title = "LLM",
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
			<path
				d="M12 22C8 22 4 19 4 16C2 14 2 10 4 8C6 4 9 2 12 3C15 2 18 4 20 8C22 10 22 14 20 16C20 19 16 22 12 22Z"
				stroke={fill}
				strokeWidth="2"
				fill="none"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M8 9L12 11L16 10"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M9 15L12 16L15 15"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M12 6C10 7 10 10 12 11C14 12 14 15 12 17"
				stroke={fill}
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle cx="8" cy="9" r="1.5" fill={fill} />
			<circle cx="16" cy="10" r="1.5" fill={fill} />
			<circle cx="9" cy="15" r="1.5" fill={fill} />
			<circle cx="15" cy="15" r="1.5" fill={fill} />
		</svg>
	);
};

export const LLM = memo(LLMComponent);
