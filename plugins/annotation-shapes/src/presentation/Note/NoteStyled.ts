import styled from "@emotion/styled";

type NoteStrokeProps = {
	/** Resolved stroke color (auto is resolved to the theme foreground). */
	strokeColor: string;
};

type NoteBodyProps = NoteStrokeProps & {
	/** Resolved fill color (auto is resolved to the theme surface). */
	fillColor: string;
};

/**
 * The note's silhouette. `pointer-events: auto` keeps a `transparent` fill
 * grabbable — the interior is still painted, unlike `fill: none`.
 */
export const NoteBodyPath = styled.path<NoteBodyProps>`
	stroke: ${({ strokeColor }) => strokeColor};
	fill: ${({ fillColor }) => fillColor};
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
export const NoteFoldPath = styled.path<NoteStrokeProps>`
	stroke: ${({ strokeColor }) => strokeColor};
	fill: none;
	stroke-linecap: round;
	stroke-linejoin: round;
	pointer-events: none;
`;
