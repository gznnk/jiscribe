import { memo } from "react";

type GripIconProps = {
	width?: number;
	height?: number;
};

/**
 * Two columns of dots, the handle of a row that can be dragged to another place
 * (a pinned category in the stencil rail's "…" popover). Filled dots on integer
 * centers, so they stay sharp at the sizes it is drawn at.
 */
const GripIconComponent: React.FC<GripIconProps> = ({
	width = 12,
	height = 12,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 12 12"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle cx="4" cy="2" r="1" fill="currentColor" />
			<circle cx="8" cy="2" r="1" fill="currentColor" />
			<circle cx="4" cy="6" r="1" fill="currentColor" />
			<circle cx="8" cy="6" r="1" fill="currentColor" />
			<circle cx="4" cy="10" r="1" fill="currentColor" />
			<circle cx="8" cy="10" r="1" fill="currentColor" />
		</svg>
	);
};

export const GripIcon = memo(GripIconComponent);
