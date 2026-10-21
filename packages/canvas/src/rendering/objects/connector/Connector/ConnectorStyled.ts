import styled from "@emotion/styled";

import { LINE_HIT_STROKE_WIDTH } from "../../utils/hitStrokeWidth";
import type { StrokePaintProps } from "../../utils/shapePaint";
import { strokePaint } from "../../utils/shapePaint";

/**
 * The whole-path band. It takes clicks (select, and double click to edit the label) but no drag —
 * the line as a whole cannot be moved, since where it runs is decided by the shapes it connects. So
 * the cursor is the clickable one and not the `grab` that shapes use, which here would promise a
 * drag that never happens (#229). The per-segment bands drawn over this one name their own cursor.
 */
export const ConnectorHitArea = styled.polyline<{
	disablePointerEvents?: boolean;
}>`
	pointer-events: ${({ disablePointerEvents }) =>
		disablePointerEvents ? "none" : "stroke"};
	cursor: pointer;
	fill: none;
	stroke: transparent;
	stroke-width: ${LINE_HIT_STROKE_WIDTH};
	stroke-linecap: round;
	stroke-linejoin: round;
`;

/** A straight segment's move band (ConnectorSegmentMoveHitAreas). */
export const ConnectorSegmentMoveHitArea = styled.line<{
	disablePointerEvents?: boolean;
}>`
	stroke: transparent;
	stroke-width: ${LINE_HIT_STROKE_WIDTH};
	pointer-events: ${({ disablePointerEvents }) =>
		disablePointerEvents ? "none" : "stroke"};
	/* The segment goes wherever the cursor does, so the cursor says so. */
	cursor: move;
`;

/** A right-angle segment's slide band (ConnectorSegmentSlideHitAreas). */
export const ConnectorSegmentSlideHitArea = styled.rect<{
	horizontal: boolean;
	disablePointerEvents?: boolean;
}>`
	fill: transparent;
	pointer-events: ${({ disablePointerEvents }) =>
		disablePointerEvents ? "none" : "fill"};
	/* The segment only moves across itself, so the cursor names that axis. */
	cursor: ${({ horizontal }) => (horizontal ? "ns-resize" : "ew-resize")};
`;

export const ConnectorElement = styled.polyline<StrokePaintProps>`
	${strokePaint}
	pointer-events: none;
	fill: none;

	&:focus {
		outline: none;
	}
`;
