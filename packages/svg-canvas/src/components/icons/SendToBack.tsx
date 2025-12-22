import React, { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Send to back icon component
 */
const SendToBackComponent: React.FC<IconProps> = ({
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
			<polygon points="4,3 12,13 20,3" fill={fill} />
			<polygon points="4,12 12,21 20,12" fill={fill} />
		</svg>
	);
};

export const SendToBack = memo(SendToBackComponent);
