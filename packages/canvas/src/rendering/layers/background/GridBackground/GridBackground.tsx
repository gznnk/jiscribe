import { memo } from "react";

type GridBackgroundProps = {
	x: number;
	y: number;
	width: number;
	height: number;
	/** Id of this canvas's GridPattern (`url(#id)` is document-global, see CanvasView). */
	patternId: string;
};

/**
 * SVG grid background rect component.
 */
const GridBackgroundComponent = ({
	x,
	y,
	width,
	height,
	patternId,
}: GridBackgroundProps): React.JSX.Element => {
	return (
		<rect
			x={x}
			y={y}
			width={width}
			height={height}
			fill={`url(#${patternId})`}
			pointerEvents="none"
			// Excluded from PNG/SVG export (like draw.io, the grid is not part of the image)
			data-canvas-export="exclude"
			// The only stable handle on this rect: its fill carries the per-instance
			// pattern id (see GridProps.patternId), so it cannot be selected by value.
			data-testid="grid-background"
		/>
	);
};

export const GridBackground = memo(GridBackgroundComponent);
