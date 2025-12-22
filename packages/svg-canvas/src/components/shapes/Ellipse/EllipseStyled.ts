import styled from "@emotion/styled";

/**
 * Props for the SVG ellipse element.
 */
type EllipseProps = {
	isTransparent?: boolean;
};

/**
 * Styled ellipse element for drag points.
 */
export const EllipseElement = styled.ellipse<EllipseProps>`
	opacity: ${(props) => (props.isTransparent ? 0 : 1)};
`;
