import type { Rect } from "@jiscribe/geometry";
import type React from "react";
import { memo } from "react";

import type { LabelBackdropLayer } from "../LabelBackdropStoreContext";

/**
 * How a label's knockout and the layers over it are rasterized while it has
 * layers: unsmoothed, so the knockout's edge pixels are exactly the top
 * layer's and no rim of the page's color shows around the box. A label with
 * no layers keeps the default smoothing.
 */
export const LABEL_BACKDROP_SHAPE_RENDERING = "crispEdges";

/** How close a layer's edge has to come to the box's to count as reaching it, in the box's units. */
const EDGE_TOLERANCE = 1e-6;

type LabelBackdropLayersProps = {
	/** The label box, in the coordinates the layers are drawn in: their origin is its top-left corner. */
	box: Rect;
	/** The layers, bottom first (useLabelBackdropLayers). */
	layers: readonly LabelBackdropLayer[];
	/**
	 * The box's corner radius, for a box drawn with rounded corners: a layer
	 * reaching one of the box's corners is rounded there by the same amount.
	 * Omitted = square corners.
	 */
	cornerRadius?: number;
	/** False hides the layers, kept mounted, along with the label they lie under. */
	isShown: boolean;
	/**
	 * The page's color (resolveLabelFill), for a label drawing its knockout here
	 * rather than on its own box: painted over the whole box, rounded by
	 * `cornerRadius`, under the layers. Omitted = the layers alone.
	 */
	knockout?: string;
};

/**
 * The outline of `layerRect` (absolute) with each corner it shares with `box`
 * rounded by `radius`, the radius shrunk to fit a narrow layer.
 */
const buildRoundedLayerPath = (
	layerRect: Rect,
	box: Rect,
	radius: number,
): string => {
	const left = layerRect.x;
	const top = layerRect.y;
	const right = layerRect.x + layerRect.width;
	const bottom = layerRect.y + layerRect.height;
	const reachesLeft = left <= box.x + EDGE_TOLERANCE;
	const reachesTop = top <= box.y + EDGE_TOLERANCE;
	const reachesRight = right >= box.x + box.width - EDGE_TOLERANCE;
	const reachesBottom = bottom >= box.y + box.height - EDGE_TOLERANCE;
	const fitted = Math.max(
		0,
		Math.min(radius, layerRect.width / 2, layerRect.height / 2),
	);
	const topLeft = reachesLeft && reachesTop ? fitted : 0;
	const topRight = reachesRight && reachesTop ? fitted : 0;
	const bottomRight = reachesRight && reachesBottom ? fitted : 0;
	const bottomLeft = reachesLeft && reachesBottom ? fitted : 0;
	const arcTo = (cornerRadius: number, x: number, y: number): string =>
		cornerRadius > 0 ? ` A${cornerRadius} ${cornerRadius} 0 0 1 ${x} ${y}` : "";
	return (
		`M${left + topLeft} ${top}` +
		` H${right - topRight}${arcTo(
			topRight,
			right,
			top + topRight,
		)} V${bottom - bottomRight}${arcTo(
			bottomRight,
			right - bottomRight,
			bottom,
		)} H${left + bottomLeft}${arcTo(
			bottomLeft,
			left,
			bottom - bottomLeft,
		)} V${top + topLeft}${arcTo(topLeft, left + topLeft, top)} Z`
	);
};

/** Whether `layerRect` shares a corner with `box`, which is where a rounded box clips it. */
const reachesBoxCorner = (layerRect: Rect, box: Rect): boolean => {
	const reachesLeft = layerRect.x <= box.x + EDGE_TOLERANCE;
	const reachesTop = layerRect.y <= box.y + EDGE_TOLERANCE;
	const reachesRight =
		layerRect.x + layerRect.width >= box.x + box.width - EDGE_TOLERANCE;
	const reachesBottom =
		layerRect.y + layerRect.height >= box.y + box.height - EDGE_TOLERANCE;
	return (reachesLeft || reachesRight) && (reachesTop || reachesBottom);
};

const LabelBackdropLayersComponent: React.FC<LabelBackdropLayersProps> = ({
	box,
	layers,
	cornerRadius,
	isShown,
	knockout,
}) => (
	<>
		{knockout !== undefined && (
			<rect
				x={box.x}
				y={box.y}
				width={box.width}
				height={box.height}
				rx={cornerRadius}
				ry={cornerRadius}
				pointerEvents="none"
				display={isShown ? undefined : "none"}
				shapeRendering={LABEL_BACKDROP_SHAPE_RENDERING}
				// A style rather than the attribute: a CSS variable does not resolve
				// in a presentation attribute.
				style={{ fill: knockout }}
			/>
		)}
		<g
			pointerEvents="none"
			display={isShown ? undefined : "none"}
			shapeRendering={LABEL_BACKDROP_SHAPE_RENDERING}
		>
			{layers.map((layer, index) => {
				const layerRect: Rect = {
					x: box.x + layer.rect.x,
					y: box.y + layer.rect.y,
					width: layer.rect.width,
					height: layer.rect.height,
				};
				// A style rather than attributes: the color may be a theme token, and a
				// CSS variable does not resolve in a presentation attribute.
				const paint = { fill: layer.fill, fillOpacity: layer.fillOpacity };
				return cornerRadius !== undefined &&
					cornerRadius > 0 &&
					reachesBoxCorner(layerRect, box) ? (
					<path
						key={index}
						d={buildRoundedLayerPath(layerRect, box, cornerRadius)}
						style={paint}
					/>
				) : (
					<rect
						key={index}
						x={layerRect.x}
						y={layerRect.y}
						width={layerRect.width}
						height={layerRect.height}
						style={paint}
					/>
				);
			})}
		</g>
	</>
);

/**
 * The frames' fills lying under a label, painted over the page's color behind
 * it so an `"auto"` label blends into the frame it sits on: one shape per
 * layer, in one group, taking no pointer and carrying no `data-kind`, after
 * the knockout when one is given. Shared by a caption's LabelTextFill, a
 * connector's label and that label's editor.
 */
export const LabelBackdropLayers = memo(LabelBackdropLayersComponent);
