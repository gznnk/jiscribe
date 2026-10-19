import styled from "@emotion/styled";
import type { FillPaintProps, StrokePaintProps } from "@jiscribe/canvas-sdk";
import { fillPaint, strokePaint } from "@jiscribe/canvas-sdk";

/**
 * Entity sub-parts. Only the wrapping <g> carries data-kind/data-id; the slot hit
 * areas carry `data-part` (textSlotPart), which is what a click picks a slot by
 * and a double click opens it from (getGestureTarget).
 */

/** The box's fill. Captures pointer events even when transparent, so an unfilled entity is still grabbable. */
export const ErEntityBody = styled.rect<FillPaintProps>`
	${fillPaint}
	stroke: none;
	pointer-events: all;
	cursor: grab;
`;

/** One slot's hit area: invisible, but capturing, so its data-part reaches the gesture. */
export const ErEntitySlotHitArea = styled.rect`
	fill: transparent;
	stroke: none;
	pointer-events: all;
	cursor: grab;
`;

/**
 * Line under the title band, drawn with the border's linework. `pointer-events: none` keeps it from stealing the hit from
 * the slot it borders.
 */
export const ErEntityDivider = styled.line<StrokePaintProps>`
	${strokePaint}
	pointer-events: none;
`;

/** Border. `fill: none` so it never covers what is beneath; the painted stroke keeps the edge grabbable. */
export const ErEntityOutline = styled.rect<StrokePaintProps>`
	fill: none;
	${strokePaint}
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
