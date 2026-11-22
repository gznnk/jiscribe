import styled from "@emotion/styled";

/**
 * Paint properties for arrow shapes.
 * Filled arrows pass `fillColor`, hollow arrows pass `strokeColor` (the unset
 * side becomes `none`). Values are already resolved (auto is resolved to the
 * theme foreground). CSS safety is guaranteed at the external-input boundary.
 * The alpha is the line's own `strokeOpacity` and is applied to the element
 * rather than to either paint, so the one rule covers both builds of head. Named
 * apart from the CSS property it feeds (see shapePaint).
 */
type ArrowPaintProps = {
	fillColor?: string;
	strokeColor?: string;
	alpha?: number;
};

/** The element's `opacity`; omitted draws fully opaque (the CSS initial value). */
const alphaRule = (alpha: number | undefined): string =>
	alpha === undefined ? "" : `opacity: ${alpha};`;

const arrowPaint = ({
	fillColor,
	strokeColor,
	alpha,
}: ArrowPaintProps): string => `
	fill: ${fillColor ? fillColor : "none"};
	stroke: ${strokeColor ? strokeColor : "none"};
	${alphaRule(alpha)}
`;

/**
 * The group a head built from more than one element draws into. It carries the
 * whole mark's alpha, so a translucent line does not darken where two of its
 * pieces meet; the pieces inside then take none of their own.
 */
export const ArrowGroup = styled.g<{ alpha?: number }>`
	${({ alpha }) => alphaRule(alpha)}
`;

/**
 * Styled polygon element for arrow shapes.
 * Enables pointer events for click detection.
 */
export const ArrowPolygon = styled.polygon<ArrowPaintProps>`
	${arrowPaint}
	pointer-events: auto;
	cursor: grab;
`;

/**
 * Styled polyline element for arrow shapes.
 * Enables pointer events for click detection.
 */
export const ArrowPolyline = styled.polyline<ArrowPaintProps>`
	${arrowPaint}
	pointer-events: auto;
	cursor: grab;
`;

/**
 * Styled path element for arrow shapes.
 * Used by marks made of several disconnected strokes (a cross, a crow's foot
 * and its cardinality bars), which a single polyline cannot express.
 * Enables pointer events for click detection.
 */
export const ArrowPath = styled.path<ArrowPaintProps>`
	${arrowPaint}
	pointer-events: auto;
	cursor: grab;
`;

/**
 * Styled circle element for arrow shapes.
 * Enables pointer events for click detection.
 */
export const ArrowCircle = styled.circle<ArrowPaintProps>`
	${arrowPaint}
	pointer-events: auto;
	cursor: grab;
`;
