import styled from "@emotion/styled";

/**
 * The line closing the body's top edge under the tab. The silhouette already
 * draws that edge to the right of the tab (calcUmlPackagePoints), so this is the
 * segment left over, and it shares the border's linework (same color, width and
 * dash, passed as attributes) to read as part of it. Drawn over the silhouette's
 * fill rather than under it, so no fill covers half of its stroke (UmlPackageBox).
 *
 * `pointer-events: none` keeps it from stealing the hit from the silhouette
 * beneath it, which is the shape's single grab area.
 */
export const UmlPackageTabDivider = styled.line<{ strokeColor: string }>`
	stroke: ${({ strokeColor }) => strokeColor};
	pointer-events: none;
`;
