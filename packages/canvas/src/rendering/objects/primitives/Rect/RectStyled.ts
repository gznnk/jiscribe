import styled from "@emotion/styled";

type RectElementProps = {
	/** Resolved stroke color (auto is resolved to the theme foreground). */
	strokeColor: string;
	/** Resolved fill color (auto is resolved to the theme surface). */
	fillColor: string;
};

export const RectElement = styled.rect<RectElementProps>`
	stroke: ${({ strokeColor }) => strokeColor};
	fill: ${({ fillColor }) => fillColor};
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
