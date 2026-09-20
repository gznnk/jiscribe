import styled from "@emotion/styled";
import type { FillPaintProps, StrokePaintProps } from "@jiscribe/canvas-sdk";
import { fillPaint, strokePaint } from "@jiscribe/canvas-sdk";

/**
 * Container ("frame") sub-parts. The BODY never captures pointer events, so a
 * click on the interior falls through to whatever object sits inside (or the
 * canvas) — the container is selectable only by its HEADER band and the strip
 * along its border. This needs no change to the hit-testing path: pass-through
 * is purely these pointer-events rules (getGestureTarget walks to the wrapping
 * <g data-kind>).
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
 * Border. `fill: none` keeps the interior pass-through, and
 * `pointer-events: none` hands the edge over to ContainerOutlineHitArea — the
 * painted stroke is a 1px target at the default width, and thinner still once
 * zoomed out.
 */
export const ContainerOutline = styled.rect<StrokePaintProps>`
	fill: none;
	${strokePaint}
	pointer-events: none;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;

/**
 * Invisible grab strip along the border, the same build as AwsGroupOutlineHitArea:
 * `pointer-events: stroke` makes only the band a target and leaves the interior
 * through. The band straddles the edge, so its inner half (6 world units) takes
 * clicks that would otherwise reach a shape placed hard against the frame.
 */
export const ContainerOutlineHitArea = styled.rect`
	fill: none;
	stroke: transparent;
	stroke-width: 12;
	pointer-events: stroke;
	cursor: grab;
`;
