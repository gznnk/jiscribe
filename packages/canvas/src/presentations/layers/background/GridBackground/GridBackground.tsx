import { memo } from "react";

type GridBackgroundProps = {
	x: number;
	y: number;
	width: number;
	height: number;
};

/**
 * SVG grid background rect component.
 */
const GridBackgroundComponent = ({
	x,
	y,
	width,
	height,
}: GridBackgroundProps): React.JSX.Element => {
	return (
		<rect
			x={x}
			y={y}
			width={width}
			height={height}
			fill="url(#grid)"
			pointerEvents="none"
		/>
	);
};

export const GridBackground = memo(GridBackgroundComponent);
