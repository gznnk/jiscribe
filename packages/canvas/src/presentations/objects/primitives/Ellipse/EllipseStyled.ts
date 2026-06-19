import styled from "@emotion/styled";

type EllipseElementProps = {
	isTransparent?: boolean;
};

export const EllipseElement = styled.ellipse<EllipseElementProps>`
	pointer-events: auto;
	cursor: grab;

	/* Outline handling via CSS or attributes can be added here */
	&:focus {
		outline: none;
	}
`;
