import type { ShapePreviewRenderer } from "@workspace/canvas";

import { CONTAINER_HEADER_HEIGHT } from "../schema/ContainerDoc";

/**
 * Preview renderer for a Container while it is being drawn. Previews are a
 * stroke-derived translucent "ghost" (fill/stroke come pre-mixed from
 * DrawingPreviewOverlay), so this mirrors the committed shape's ANATOMY —
 * header band + divider + body + border — rather than its exact colors. The
 * header sits a touch stronger than the body so it reads as a header; the
 * divider was the piece missing before. (The preview API carries no dash, so
 * the border/divider stay solid even for the dashed Boundary preset.)
 */
export const ContainerPreview: ShapePreviewRenderer = ({
	startX,
	startY,
	endX,
	endY,
	stroke,
	fill,
	strokeWidth,
}) => {
	const x = Math.min(startX, endX);
	const y = Math.min(startY, endY);
	const width = Math.abs(endX - startX);
	const height = Math.abs(endY - startY);
	const headerHeight = Math.min(CONTAINER_HEADER_HEIGHT, height);
	// Colors may contain var(--jiscribe-*) (resolved auto), so apply via style.
	return (
		<g pointerEvents="none">
			<rect x={x} y={y} width={width} height={height} style={{ fill }} />
			<rect
				x={x}
				y={y}
				width={width}
				height={headerHeight}
				style={{ fill: stroke, fillOpacity: 0.25 }}
			/>
			<line
				x1={x}
				y1={y + headerHeight}
				x2={x + width}
				y2={y + headerHeight}
				style={{ stroke }}
				strokeWidth={strokeWidth}
			/>
			<rect
				x={x}
				y={y}
				width={width}
				height={height}
				style={{ fill: "none", stroke }}
				strokeWidth={strokeWidth}
			/>
		</g>
	);
};
