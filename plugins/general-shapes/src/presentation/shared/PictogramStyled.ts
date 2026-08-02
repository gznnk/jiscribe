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
 * Invisible grab area for a part of the drawing the body paths leave unpainted
 * (PictogramFigure.hit). `transparent` still counts as painted, so this is
 * hit-tested; `none` would not be.
 */
export const PictogramHitPath = styled.path`
	fill: transparent;
	stroke: none;
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;

/**
 * Transparent grab area for a pictogram whose own strokes are too thin to hit
 * (the actor's limbs), laid over the whole box. The label a shape hangs below
 * its box has its own area in core (BelowLabelHitArea).
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
