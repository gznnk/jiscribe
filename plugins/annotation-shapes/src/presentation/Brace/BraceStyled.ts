import styled from "@emotion/styled";

type BraceCurveProps = {
	/** Resolved stroke color (auto is resolved to the theme foreground). */
	strokeColor: string;
};

/**
 * The bracket itself. Never filled: the path is open, so a fill would paint the
 * region between the arms rather than the shape. Hit-testing is left to the
 * box-wide grab area, so a thin curve is no harder to grab than a wide one.
 */
export const BraceCurve = styled.path<BraceCurveProps>`
	stroke: ${({ strokeColor }) => strokeColor};
	fill: none;
	stroke-linecap: round;
	pointer-events: none;
`;

/**
 * Transparent but hit-tested grab areas: the shape's own box, and the label
 * that hangs outside it (the label's foreignObject is `pointer-events: none`,
 * so without this it could neither be dragged nor double-clicked into the
 * editor).
 */
export const BraceHitArea = styled.rect`
	fill: transparent;
	stroke: none;
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
