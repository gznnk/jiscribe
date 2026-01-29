import styled from "@emotion/styled";

export const PolylineElement = styled.polyline`
	pointer-events: auto;
	cursor: grab;
	fill: none;

	&:focus {
		outline: none;
	}
`;
