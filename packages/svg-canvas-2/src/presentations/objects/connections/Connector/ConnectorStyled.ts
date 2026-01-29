import styled from "@emotion/styled";

export const ConnectorElement = styled.polyline`
	pointer-events: auto;
	cursor: grab;
	fill: none;

	&:focus {
		outline: none;
	}
`;
