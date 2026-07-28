import styled from "@emotion/styled";

/**
 * Record sub-parts. The compartment rects are the shape's hit regions and carry
 * `data-part` (the slot id), which is what a double click resolves the edited
 * slot from. They capture pointer events even when the fill is transparent, so an
 * unfilled record is still grabbable.
 *
 * Only the wrapping <g> carries data-kind/data-id: one object is one
 * data-kind element, and getKindAndId reads the nested data-part from there.
 */

/** One compartment: the title band and every row compartment are drawn alike. */
export const RecordCompartment = styled.rect<{ fillColor: string }>`
	fill: ${({ fillColor }) => fillColor};
	stroke: none;
	pointer-events: all;
	cursor: grab;
`;

/**
 * Line between two compartments. Shares the border's linework (same color, width,
 * and dash, passed as attributes) so it reads as part of the outline.
 * `pointer-events: none` keeps it from stealing the hit from the compartment it
 * divides — which would lose the slot's data-part.
 */
export const RecordDivider = styled.line<{ strokeColor: string }>`
	stroke: ${({ strokeColor }) => strokeColor};
	pointer-events: none;
`;

/**
 * Border. `fill: none` so it never covers the compartments beneath it; only the
 * painted stroke captures, which keeps the box edge grabbable.
 */
export const RecordOutline = styled.rect<{ strokeColor: string }>`
	fill: none;
	stroke: ${({ strokeColor }) => strokeColor};
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
