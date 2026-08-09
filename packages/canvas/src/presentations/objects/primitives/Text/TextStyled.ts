import styled from "@emotion/styled";

/**
 * The group holding a text object's hit bands. It is the object's single
 * `[data-kind]` element (the DOM contract), and it is opted out of image export
 * — nothing under it is meant to be seen.
 */
export const TextHitGroup = styled.g`
	cursor: grab;
`;

/**
 * Invisible rectangle over one line of the text, so the object can be picked at
 * all: a text object draws no shape of its own, and the overlay that draws its
 * text is a `pointerEvents="none"` foreignObject. One band per line rather than
 * one over the whole box, so the blank side a short line leaves is not the
 * object's to take (see calcTextLineHitRects).
 */
export const TextHitRect = styled.rect`
	fill: transparent;
	pointer-events: auto;
`;
