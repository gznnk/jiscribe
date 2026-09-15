import styled from "@emotion/styled";
import type { FillPaintProps, StrokePaintProps } from "@jiscribe/canvas-sdk";
import { fillPaint, strokePaint } from "@jiscribe/canvas-sdk";

/**
 * The frame's body. `pointer-events: none`, so it never takes a click meant for
 * a shape lying over it: the frame is grabbed by its border and its top-left
 * header band alone.
 */
export const AwsGroupBody = styled.rect<FillPaintProps>`
	${fillPaint}
	stroke: none;
	pointer-events: none;
`;

/**
 * The band the corner badge and the label sit in. It does take clicks, which is
 * what makes it the frame's handle; `pointer-events: all` is spelled out so a
 * transparent fill stays grabbable.
 */
export const AwsGroupHeaderHitArea = styled.rect`
	fill: transparent;
	pointer-events: all;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;

/**
 * The border. `fill: none`, so the inside takes nothing. The line itself is too
 * thin to aim at, so AwsGroupOutlineHitArea takes the hits and this only draws.
 */
export const AwsGroupOutline = styled.rect<StrokePaintProps>`
	fill: none;
	${strokePaint}
	pointer-events: none;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;

/**
 * A thick invisible grab strip along the border. `pointer-events: stroke` makes
 * only the band of the line a target and leaves the inside through (the same
 * build as canvas's PolylineHitArea). The kinds with no corner badge
 * (availability zone, security group, generic) have a small header band, so
 * without this the only target would be a 1px line.
 */
export const AwsGroupOutlineHitArea = styled.rect`
	fill: none;
	stroke: transparent;
	stroke-width: 12;
	pointer-events: stroke;
	cursor: grab;
`;
