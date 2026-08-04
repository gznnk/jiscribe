import styled from "@emotion/styled";

type ShapeBodyProps = {
	/** Resolved stroke color (auto is resolved to the theme foreground). */
	strokeColor: string;
	/** Resolved fill color (auto is resolved to the theme surface). */
	fillColor: string;
};

/**
 * The silhouette of a shape drawn as a polygon; takes `points` from the caller.
 * `pointer-events: auto` keeps a `transparent` fill grabbable — the interior is
 * still painted, unlike `fill: none`.
 */
export const ShapeBodyPolygon = styled.polygon<ShapeBodyProps>`
	stroke: ${({ strokeColor }) => strokeColor};
	fill: ${({ fillColor }) => fillColor};
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;

/** Same as ShapeBodyPolygon, drawn as a path; takes `d` from the caller. */
export const ShapeBodyPath = styled.path<ShapeBodyProps>`
	stroke: ${({ strokeColor }) => strokeColor};
	fill: ${({ fillColor }) => fillColor};
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
