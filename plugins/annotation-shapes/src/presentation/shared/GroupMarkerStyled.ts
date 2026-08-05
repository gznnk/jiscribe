import styled from "@emotion/styled";

type GroupMarkerPathProps = {
	/** Resolved stroke color (auto is resolved to the theme foreground). */
	strokeColor: string;
};

/**
 * The marker itself. Never filled: the path is open, so a fill would paint the
 * region between the arms rather than the shape. Hit-testing is left to the
 * box-wide grab area, so a thin line is no harder to grab than a wide one.
 */
export const GroupMarkerPath = styled.path<GroupMarkerPathProps>`
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
export const GroupMarkerHitArea = styled.rect`
	fill: transparent;
	stroke: none;
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
