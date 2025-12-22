import styled from "@emotion/styled";

/**
 * Props for the SVG button element.
 */
type ButtonProps = {
	isTransparent?: boolean;
	effectsEnabled?: boolean;
};

/**
 * Styled button element for drag points.
 */
export const ButtonElement = styled.rect<ButtonProps>`
	opacity: ${(props) => (props.isTransparent ? 0 : 1)};
	cursor: ${(props) => (props.effectsEnabled ? "pointer" : "move")};
	transition:
		opacity 0.2s cubic-bezier(0.645, 0.045, 0.355, 1),
		filter 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		opacity: ${(props) =>
			props.effectsEnabled
				? props.isTransparent
					? 0
					: 0.8
				: props.isTransparent
					? 0
					: 1};
	}

	&:active {
		filter: ${(props) => (props.effectsEnabled ? "brightness(0.75)" : "none")};
	}
`;
