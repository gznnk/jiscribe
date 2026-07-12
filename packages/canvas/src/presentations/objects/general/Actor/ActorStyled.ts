import styled from "@emotion/styled";

type ActorStrokeProps = {
	/** Resolved stroke color (auto is resolved to the theme foreground). */
	strokeColor: string;
};

type ActorHeadProps = ActorStrokeProps & {
	/** Resolved fill color (auto is resolved to the theme surface). */
	fillColor: string;
};

/** Full-bbox transparent hit area; the figure itself is too thin to grab. */
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
