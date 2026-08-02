import styled from "@emotion/styled";

type PictogramStrokeProps = {
	/** Resolved stroke color (auto is resolved to the theme foreground). */
	strokeColor: string;
};

type PictogramBodyProps = PictogramStrokeProps & {
	/** Resolved fill color (auto is resolved to the theme surface). */
	fillColor: string;
};

/**
 * A silhouette of the pictogram. `pointer-events: auto` keeps a `transparent`
 * fill grabbable — the interior is still painted, unlike `fill: none`.
 */
export const PictogramBodyPath = styled.path<PictogramBodyProps>`
	stroke: ${({ strokeColor }) => strokeColor};
	fill: ${({ fillColor }) => fillColor};
	stroke-linejoin: round;
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;

/** Detail lines. Never hit-tested, so they may cross the body freely. */
export const PictogramDetailPath = styled.path<PictogramStrokeProps>`
	stroke: ${({ strokeColor }) => strokeColor};
	fill: none;
	stroke-linecap: round;
	stroke-linejoin: round;
	pointer-events: none;
`;

/**
 * Transparent grab area over the label a below-label pictogram hangs outside its
 * box; the label's own foreignObject is `pointer-events: none`, so without this
 * the label could neither be dragged nor double-clicked into the editor.
 */
export const PictogramHitArea = styled.rect`
	fill: transparent;
	stroke: none;
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
