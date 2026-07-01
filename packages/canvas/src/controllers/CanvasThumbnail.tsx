import { memo, useMemo, useRef } from "react";

import { calcFitViewport } from "./utils/calcFitViewport";
import { CanvasView } from "../presentations/CanvasView";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import { canvasToState } from "../states/canvas/CanvasMapper";

type CanvasThumbnailProps = {
	/**
	 * The CanvasDoc to display. As with `Canvas`, pass a valid doc that has gone
	 * through `parseCanvasText` (two-stage validation); it is not re-validated
	 * internally (see docs/01 principle 4).
	 */
	canvasDoc: CanvasDoc;
	/** SVG width (logical px based on viewBox). Baseline value assuming CSS scaling. */
	width?: number;
	/** SVG height (logical px). The ratio to width sets the thumbnail's aspect ratio. */
	height?: number;
	/** Margin (px) kept around the content. */
	padding?: number;
};

/**
 * Read-only canvas that statically renders a doc so the whole thing fits.
 *
 * Has neither a reducer nor gestures; it simply feeds the doc into the
 * display-only {@link CanvasView}. Used for lightweight, high-fidelity,
 * non-interactive displays such as gallery thumbnails.
 */
const CanvasThumbnailComponent: React.FC<CanvasThumbnailProps> = ({
	canvasDoc,
	width = 480,
	height = 270,
	padding = 24,
}) => {
	const svgRef = useRef<SVGSVGElement>(null);

	const { objects, rootIds } = useMemo(
		() => canvasToState(canvasDoc),
		[canvasDoc],
	);

	const viewport = useMemo(
		() =>
			calcFitViewport(objects, { width, height, padding }) ?? {
				minX: 0,
				minY: 0,
				width,
				height,
				zoom: 1,
			},
		[objects, width, height, padding],
	);

	return (
		<CanvasView
			objects={objects}
			rootIds={rootIds}
			viewport={viewport}
			svgRef={svgRef}
		/>
	);
};

export const CanvasThumbnail = memo(CanvasThumbnailComponent);
