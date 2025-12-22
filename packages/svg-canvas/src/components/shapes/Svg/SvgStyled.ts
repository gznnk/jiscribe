import styled from "@emotion/styled";

/**
 * Props for the SVG group element.
 */
type SvgGroupProps = {
	isTransparent?: boolean;
};

/**
 * Props for the SVG rect element.
 */
type SvgRectProps = {
	isTransparent?: boolean;
};

/**
 * Styled group element for SVG content.
 */
export const SvgGroupElement = styled.g<SvgGroupProps>`
	opacity: ${(props) => (props.isTransparent ? 0 : 1)};
`;

/**
 * Styled rect element for pointer events.
 */
export const SvgRectElement = styled.rect<SvgRectProps>`
	opacity: ${(props) => (props.isTransparent ? 0 : 1)};
`;
