import styled from "@emotion/styled";

/** A track grip's heading text. Its ink is a theme var, so it goes on through `style`. */
export const TableGripLabel = styled.text`
	pointer-events: none;
	user-select: none;
`;

/**
 * The pressable region over a grip's cell, the track grips' and the corner's
 * alike. Unpainted, so `pointer-events: all` is what makes it hit-tested.
 */
export const TableGripHitArea = styled.rect`
	fill: none;
	pointer-events: all;
	cursor: pointer;
`;
