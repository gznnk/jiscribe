import styled from "@emotion/styled";

/**
 * Color properties for arrow shapes.
 * Filled arrows pass `fillColor`, hollow arrows pass `strokeColor` (the unset
 * side becomes `none`). Values are already resolved (auto is resolved to the
 * theme foreground). CSS safety is guaranteed at the external-input boundary.
 */
type ArrowColorProps = {
	fillColor?: string;
	strokeColor?: string;
};

const arrowColor = ({ fillColor, strokeColor }: ArrowColorProps): string => `
	fill: ${fillColor ? fillColor : "none"};
	stroke: ${strokeColor ? strokeColor : "none"};
`;

/**
 * Styled polygon element for arrow shapes.
 * Enables pointer events for click detection.
 */
export const ArrowPolygon = styled.polygon<ArrowColorProps>`
	${arrowColor}
	pointer-events: auto;
	cursor: grab;
`;

/**
 * Styled polyline element for arrow shapes.
 * Enables pointer events for click detection.
 */
export const ArrowPolyline = styled.polyline<ArrowColorProps>`
	${arrowColor}
	pointer-events: auto;
	cursor: grab;
`;

/**
 * Styled circle element for arrow shapes.
 * Enables pointer events for click detection.
 */
export const ArrowCircle = styled.circle<ArrowColorProps>`
	${arrowColor}
	pointer-events: auto;
	cursor: grab;
`;
