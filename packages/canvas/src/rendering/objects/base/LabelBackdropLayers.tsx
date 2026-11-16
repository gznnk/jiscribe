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

type LabelBackdropLayersProps = {
	/** The label box, in the coordinates it is drawn in: every layer covers all of it. */
	box: Rect;
	/** The layers, bottom first (useLabelBackdropLayers). */
	layers: readonly LabelBackdropLayer[];
	/**
	 * The box's corner radius, for a box drawn with rounded corners: every layer
	 * and the knockout are rounded by the same amount. Omitted = square corners.
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
			{layers.map((layer, index) => (
				<rect
					key={index}
					x={box.x}
					y={box.y}
					width={box.width}
					height={box.height}
					rx={cornerRadius}
					ry={cornerRadius}
					// A style rather than attributes: the color may be a theme token, and
					// a CSS variable does not resolve in a presentation attribute.
					style={{ fill: layer.fill, fillOpacity: layer.fillOpacity }}
				/>
			))}
		</g>
	</>
);

/**
 * The fills of the frames under a label's center, painted over the page's
 * color behind it so an `"auto"` label blends into the frame it sits on: one
 * rect over the whole box per layer, in one group, taking no pointer and
 * carrying no `data-kind`, after the knockout when one is given. Shared by a caption's LabelTextFill, a
 * connector's label and that label's editor.
 */
export const LabelBackdropLayers = memo(LabelBackdropLayersComponent);
