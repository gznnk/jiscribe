import styled from "@emotion/styled";

/**
 * Styled polygon element for arrow shapes.
 * Enables pointer events for click detection.
 */
export const ArrowPolygon = styled.polygon`
	pointer-events: auto;
	cursor: grab;
`;

/**
 * Styled polyline element for arrow shapes.
 * Enables pointer events for click detection.
 */
export const ArrowPolyline = styled.polyline`
	pointer-events: auto;
	cursor: grab;
`;

/**
 * Styled circle element for arrow shapes.
 * Enables pointer events for click detection.
 */
export const ArrowCircle = styled.circle`
	pointer-events: auto;
	cursor: grab;
`;
