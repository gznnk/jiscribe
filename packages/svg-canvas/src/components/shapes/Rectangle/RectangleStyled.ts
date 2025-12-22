import styled from "@emotion/styled";

/**
 * Props for the SVG rectangle element.
 */
type RectangleProps = {
	isTransparent?: boolean;
};

/**
 * Styled rectangle element for drag points.
 */
export const RectangleElement = styled.rect<RectangleProps>`
	opacity: ${(props) => (props.isTransparent ? 0 : 1)};
`;
