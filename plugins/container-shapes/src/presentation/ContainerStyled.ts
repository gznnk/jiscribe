import styled from "@emotion/styled";

/**
 * Container ("frame") sub-parts. The BODY never captures pointer events, so a
 * click on the interior falls through to whatever object sits inside (or the
 * canvas) — the container is selectable only by its HEADER band and its OUTLINE
 * stroke. This needs no change to the hit-testing path: pass-through is purely
 * these pointer-events rules (getGestureTarget walks to the wrapping <g data-kind>).
 */

/** Optional background tint. `pointer-events: none` = never steals interior clicks. */
export const ContainerBody = styled.rect<{ fillColor: string }>`
	fill: ${({ fillColor }) => fillColor};
	stroke: none;
	pointer-events: none;
`;

/**
 * Title band. Captures clicks, so the header is the grab / select target.
 * `fillColor` is the resolved headerFill ("auto" → theme surface by default);
 * `pointer-events: all` keeps it grabbable even when the fill is transparent.
 */
export const ContainerHeader = styled.rect<{ fillColor: string }>`
	fill: ${({ fillColor }) => fillColor};
	pointer-events: all;
	cursor: grab;
`;

/**
 * Divider under the header band. Shares the border's linework — same stroke
 * color, width, and dash (passed as attributes) — so it reads as part of the
 * frame outline (matches draw.io). `pointer-events: none` keeps it inert.
 */
export const ContainerDivider = styled.line<{ strokeColor: string }>`
	stroke: ${({ strokeColor }) => strokeColor};
	pointer-events: none;
`;

/**
 * Border. `fill: none` means the interior does not capture pointer events
 * (default `visiblePainted`) — only the painted stroke does, so the box edge
 * selects the container while the interior stays pass-through.
 */
export const ContainerOutline = styled.rect<{ strokeColor: string }>`
	fill: none;
	stroke: ${({ strokeColor }) => strokeColor};
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
