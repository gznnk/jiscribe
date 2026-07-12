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
			// Excluded from PNG/SVG export (like draw.io, the grid is not part of the image)
			data-canvas-export="exclude"
		/>
	);
};

export const GridBackground = memo(GridBackgroundComponent);
