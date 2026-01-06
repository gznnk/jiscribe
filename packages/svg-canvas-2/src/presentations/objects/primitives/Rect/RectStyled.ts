import styled from "@emotion/styled";

type RectElementProps = {
	isTransparent?: boolean;
};

export const RectElement = styled.rect<RectElementProps>`
	pointer-events: auto;
	cursor: grab;

	/* Outline handling via CSS or attributes can be added here */
	&:focus {
		outline: none;
	}
`;
