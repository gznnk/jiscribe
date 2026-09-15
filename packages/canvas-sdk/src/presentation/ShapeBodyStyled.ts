import styled from "@emotion/styled";
import type {
	FillPaintProps,
	StrokePaintProps,
} from "@jiscribe/canvas/unstable";
import { fillPaint, strokePaint } from "@jiscribe/canvas/unstable";

type ShapeBodyProps = StrokePaintProps & FillPaintProps;

/**
 * The silhouette of a shape drawn as a polygon; takes `points` from the caller.
 * `pointer-events: auto` keeps a `transparent` fill grabbable — the interior is
 * still painted, unlike `fill: none`.
 */
export const ShapeBodyPolygon = styled.polygon<ShapeBodyProps>`
	${strokePaint}
	${fillPaint}
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;

/** Same as ShapeBodyPolygon, drawn as a path; takes `d` from the caller. */
export const ShapeBodyPath = styled.path<ShapeBodyProps>`
	${strokePaint}
	${fillPaint}
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
