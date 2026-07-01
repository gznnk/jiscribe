import type { ReactNode } from "react";

/**
 * Information needed to draw the preview element while drag-drawing.
 * stroke / fill are passed already resolved via resolveAutoColor by the caller.
 */
export type ShapePreviewProps = {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	stroke: string;
	fill: string;
	strokeWidth: number;
};

/**
 * Preview rendering function per shape type.
 * Handles only the shape-specific drawing (line vs. rectangle vs. ellipse).
 */
export type ShapePreviewRenderer = (props: ShapePreviewProps) => ReactNode;
