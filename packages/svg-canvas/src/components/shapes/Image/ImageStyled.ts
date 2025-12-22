import styled from "@emotion/styled";

/**
 * Props for the SVG image element.
 */
type ImageProps = {
	isTransparent?: boolean;
};

/**
 * Styled image element for diagrams.
 */
export const ImageElement = styled.image<ImageProps>`
	opacity: ${(props) => (props.isTransparent ? 0 : 1)};
`;
