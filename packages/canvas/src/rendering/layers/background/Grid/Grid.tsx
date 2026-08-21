import { memo, useId } from "react";

import { GridBackground } from "../GridBackground";
import { GridPattern } from "../GridPattern";

type GridProps = {
	zoom: number;
	baseGridSize?: number;
	/** Grid line color, derived from the resolved surface (see CanvasView). */
	color: string;
	/** Visible viewport in world coordinates, filled by the background rect. */
	x: number;
	y: number;
	width: number;
	height: number;
};

/**
 * The whole background grid: the pattern definition (GridPattern) and the
 * viewport-filling rect that paints it (GridBackground), bound to each other by
 * a pattern id generated here — SVG `url(#id)` resolution is document-global,
 * so a fixed id would let two mounted canvases (multi-canvas hosts) — or any
 * host-page element with the same id — resolve each other's grid, drawing the
 * wrong density and color. useId is unique per React root; its delimiters are
 * stripped so the id stays a plain funcIRI-safe token.
 */
const GridComponent = ({
	zoom,
	baseGridSize,
	color,
	x,
	y,
	width,
	height,
}: GridProps): React.JSX.Element => {
	const patternId = `grid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

	return (
		<>
			<GridPattern
				zoom={zoom}
				baseGridSize={baseGridSize}
				color={color}
				patternId={patternId}
			/>
			<GridBackground
				x={x}
				y={y}
				width={width}
				height={height}
				patternId={patternId}
			/>
		</>
	);
};

export const Grid = memo(GridComponent);
