import { memo, useLayoutEffect, useState } from "react";
import type React from "react";

import { ContentGroup, Svg } from "./CanvasViewStyled";
import { CanvasDefs } from "./defs/CanvasDefs";
import type { CanvasState } from "../states/canvas/CanvasState";
import { deriveGridLineColor } from "./layers/background/deriveGridLineColor";
import { GridBackground } from "./layers/background/GridBackground";
import { GridPattern } from "./layers/background/GridPattern";
import { ObjectsRenderer } from "./layers/content/ObjectsRenderer";

type CanvasViewProps = {
	svgRef: React.RefObject<SVGSVGElement | null>;
	children?: React.ReactNode;
	textEditObjectId?: string | null;
	/** Slot the open editor targets, so only that slot's text is hidden (see ObjectsRenderer). */
	textEditSlotId?: string | null;
	isDrawMode?: boolean;
	/**
	 * Viewport culling: IDs to render (see ObjectsRenderer). Omit to render the
	 * full tree (export / thumbnail / any path that snapshots the DOM).
	 */
	visibleObjectIds?: ReadonlySet<string>;
	/** Render the background grid (default true). See {@link GridPattern}. */
	showGrid?: boolean;
	/** Base grid spacing in world units (default 25), passed to GridPattern. */
	gridSize?: number;
	/**
	 * The theme surface color token (`canvasBg`). Not used directly — it is a
	 * re-derivation trigger: the grid line color is read from the *resolved* SVG
	 * background, and that read must re-run when a theme swap changes this token
	 * (see the layout effect below).
	 */
	surfaceColor?: string;
} & Pick<CanvasState, "objects" | "rootIds" | "viewport" | "background">;

const CanvasViewComponent: React.FC<CanvasViewProps> = ({
	objects,
	rootIds,
	viewport,
	svgRef,
	children,
	textEditObjectId,
	textEditSlotId,
	isDrawMode = false,
	visibleObjectIds,
	showGrid = true,
	gridSize = 25,
	background,
	surfaceColor,
}) => {
	const { minX, minY, width, height, zoom } = viewport;

	// A doc-authored surface color paints via the SVG's own background-color
	// (below), so image export — which reads getComputedStyle(svg).backgroundColor
	// — follows it for free. Absent → the styled theme background stays in effect.
	//
	// The grid line is derived from that same *resolved* surface color, so it
	// reads on any background: a doc color, or the theme's canvasBg which may be a
	// CSS var (VSCode) that only resolves in the DOM. Reading getComputedStyle
	// covers every case, so there is no separate grid-line theme token. Re-derive
	// when the doc background or the theme surface token changes. useLayoutEffect
	// (not useEffect) so the color is set before the browser paints — no flash.
	const [gridLineColor, setGridLineColor] = useState("transparent");
	useLayoutEffect(() => {
		const svg = svgRef.current;
		if (svg === null) {
			return;
		}
		const derived = deriveGridLineColor(getComputedStyle(svg).backgroundColor);
		if (derived !== null) {
			setGridLineColor(derived);
		}
	}, [svgRef, background, surfaceColor]);

	return (
		<Svg
			ref={svgRef}
			width={width}
			height={height}
			viewBox={`${minX} ${minY} ${width / zoom} ${height / zoom}`}
			style={
				background !== undefined ? { backgroundColor: background } : undefined
			}
		>
			<CanvasDefs />
			{showGrid && (
				<>
					{/* Grid pattern definition */}
					<GridPattern
						zoom={zoom}
						baseGridSize={gridSize}
						color={gridLineColor}
					/>
					{/* Grid background */}
					<GridBackground
						x={minX}
						y={minY}
						width={width / zoom}
						height={height / zoom}
					/>
				</>
			)}
			<ContentGroup isDrawMode={isDrawMode}>
				{/* Traverse rootIds (in z-order) and render objects and connectors interleaved */}
				<ObjectsRenderer
					objects={objects}
					rootIds={rootIds}
					textEditObjectId={textEditObjectId}
					textEditSlotId={textEditSlotId}
					visibleObjectIds={visibleObjectIds}
				/>
				{/* Overlay layers injected from parent. These are control UI
				    (selection handles, control frames, snap guides, ...), so they
				    are marked data-canvas-export="exclude" and left out of image export. */}
				<g data-canvas-export="exclude">{children}</g>
			</ContentGroup>
		</Svg>
	);
};

export const CanvasView = memo(CanvasViewComponent);
