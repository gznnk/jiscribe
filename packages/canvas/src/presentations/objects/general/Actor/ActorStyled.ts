import styled from "@emotion/styled";

type ActorStrokeProps = {
	/** Resolved stroke color (auto is resolved to the theme foreground). */
	strokeColor: string;
};

type ActorHeadProps = ActorStrokeProps & {
	/** Resolved fill color (auto is resolved to the theme surface). */
	fillColor: string;
};

/**
 * Transparent hit area; the figure itself is too thin to grab. Drawn twice: over
 * the whole bounding box, and over the label, whose own foreignObject is
 * `pointer-events: none` and sits outside the box.
 */
export const ActorHitArea = styled.rect`
	fill: transparent;
	stroke: none;
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;

export const ActorHead = styled.circle<ActorHeadProps>`
	stroke: ${({ strokeColor }) => strokeColor};
	fill: ${({ fillColor }) => fillColor};
	pointer-events: none;
`;

export const ActorLimbs = styled.path<ActorStrokeProps>`
	stroke: ${({ strokeColor }) => strokeColor};
	fill: none;
	stroke-linecap: round;
	pointer-events: none;
`;
