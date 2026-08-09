import styled from "@emotion/styled";
import { ShapeBodyPath } from "@jiscribe/canvas-sdk";

type PictogramStrokeProps = {
	/** Resolved stroke color (auto is resolved to the theme foreground). */
	strokeColor: string;
};

/** A silhouette of the pictogram; rounded joins keep its many corners soft. */
export const PictogramBodyPath = styled(ShapeBodyPath)`
	stroke-linejoin: round;
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
 * its box has its own area in the sdk (BelowLabelHitArea).
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
