import { memo } from "react";

import type { IconProps } from "../../types/props/icon/IconProps";

/**
 * Send backward icon component
 */
const SendBackwardComponent: React.FC<IconProps> = ({
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
			<polygon points="4,6 12,17 20,6" fill={fill} />
		</svg>
	);
};

export const SendBackward = memo(SendBackwardComponent);
