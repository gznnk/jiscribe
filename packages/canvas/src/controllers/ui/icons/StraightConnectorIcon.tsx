import { memo } from "react";

type StraightConnectorIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Straight connector routing icon: a single diagonal line between endpoints.
 */
const StraightConnectorIconComponent: React.FC<StraightConnectorIconProps> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title = "Straight",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{title}</title>
		<line x1="5" y1="19" x2="19" y2="5" stroke={fill} strokeWidth="2" />
		<circle cx="5" cy="19" r="2" fill={fill} />
		<circle cx="19" cy="5" r="2" fill={fill} />
	</svg>
);

export const StraightConnectorIcon = memo(StraightConnectorIconComponent);
