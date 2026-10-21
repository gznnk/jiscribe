import styled from "@emotion/styled";

/** A grip's cell. Its paints are theme vars, so they go on through `style`. */
export const ErEntityGripCell = styled.rect`
	pointer-events: none;
`;

/** The heading's text. Its ink is a theme var, so it goes on through `style`. */
export const ErEntityGripLabel = styled.text`
	pointer-events: none;
	user-select: none;
`;

/**
 * The pressable region over a grip's cell. Unpainted, so `pointer-events: all`
 * is what makes it hit-tested.
 */
export const ErEntityGripHitArea = styled.rect`
	fill: none;
	pointer-events: all;
	cursor: pointer;
`;
