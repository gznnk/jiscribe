import styled from "@emotion/styled";

/**
 * The grab rect itself. Transparent but hit-tested, so it grabs without being
 * seen; `cursor: grab` matches the shape's own silhouette, since dragging it
 * moves the shape rather than the label.
 */
export const HitAreaRect = styled.rect`
	fill: transparent;
	stroke: none;
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
