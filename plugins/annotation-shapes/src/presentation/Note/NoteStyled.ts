import styled from "@emotion/styled";
import type { FillPaintProps, StrokePaintProps } from "@jiscribe/canvas-sdk";
import { fillPaint, strokePaint } from "@jiscribe/canvas-sdk";

/**
 * The note's silhouette. `pointer-events: auto` keeps a `transparent` fill
 * grabbable — the interior is still painted, unlike `fill: none`.
 */
export const NoteBodyPath = styled.path<StrokePaintProps & FillPaintProps>`
	${strokePaint}
	${fillPaint}
	stroke-linejoin: round;
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;

/**
 * The folded corner's two legs. Never filled, so the flap is a pair of lines
 * rather than a triangle of its own, and never hit-tested, so it cannot take a
 * grab away from the body it sits on.
 */
export const NoteFoldPath = styled.path<StrokePaintProps>`
	${strokePaint}
	fill: none;
	stroke-linecap: round;
	stroke-linejoin: round;
	pointer-events: none;
`;
