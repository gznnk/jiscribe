import { memo } from "react";

type OrthogonalConnectorIconProps = {
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
};

/**
 * Orthogonal connector routing icon: an L-shaped (right-angle) path between endpoints.
 */
const OrthogonalConnectorIconComponent: React.FC<
	OrthogonalConnectorIconProps
> = ({
	width = 24,
	height = 24,
	fill = "currentColor",
	title = "Orthogonal",
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>{title}</title>
		<polyline
			points="5,19 5,12 19,12 19,5"
			fill="none"
			stroke={fill}
			strokeWidth="2"
			strokeLinejoin="round"
		/>
		<circle cx="5" cy="19" r="2" fill={fill} />
		<circle cx="19" cy="5" r="2" fill={fill} />
	</svg>
);

export const OrthogonalConnectorIcon = memo(OrthogonalConnectorIconComponent);
