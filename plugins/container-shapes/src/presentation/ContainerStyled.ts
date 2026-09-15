import styled from "@emotion/styled";
import type { FillPaintProps, StrokePaintProps } from "@jiscribe/canvas-sdk";
import { fillPaint, strokePaint } from "@jiscribe/canvas-sdk";

/**
 * Container ("frame") sub-parts. The BODY never captures pointer events, so a
 * click on the interior falls through to whatever object sits inside (or the
 * canvas) — the container is selectable only by its HEADER band and its OUTLINE
 * stroke. This needs no change to the hit-testing path: pass-through is purely
 * these pointer-events rules (getGestureTarget walks to the wrapping <g data-kind>).
 */

/** Optional background tint. `pointer-events: none` = never steals interior clicks. */
export const ContainerBody = styled.rect<FillPaintProps>`
	${fillPaint}
	stroke: none;
	pointer-events: none;
`;

/**
 * Title band. Captures clicks, so the header is the grab / select target.
 * `fillColor` is the resolved headerFill ("auto" → theme surface by default);
 * `pointer-events: all` keeps it grabbable even when the fill is transparent.
 */
export const ContainerHeader = styled.rect<FillPaintProps>`
	${fillPaint}
	pointer-events: all;
	cursor: grab;
`;

/**
 * Divider under the header band. Shares the border's linework — same stroke
 * color, width, and dash (passed as attributes) — so it reads as part of the
 * frame outline (matches draw.io). `pointer-events: none` keeps it inert.
 */
export const ContainerDivider = styled.line<StrokePaintProps>`
	${strokePaint}
	pointer-events: none;
`;

/**
 * Border. `fill: none` means the interior does not capture pointer events
 * (default `visiblePainted`) — only the painted stroke does, so the box edge
 * selects the container while the interior stays pass-through.
 */
export const ContainerOutline = styled.rect<StrokePaintProps>`
	fill: none;
	${strokePaint}
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
