import styled from "@emotion/styled";

type PolygonElementProps = {
	/** Resolved stroke color (auto is resolved to the theme foreground). */
	strokeColor: string;
	/** Resolved fill color (auto is resolved to the theme surface). */
	fillColor: string;
};

export const PolygonElement = styled.polygon<PolygonElementProps>`
	stroke: ${({ strokeColor }) => strokeColor};
	fill: ${({ fillColor }) => fillColor};
	pointer-events: all;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
