import { keyframes, css } from "@emotion/react";
import styled from "@emotion/styled";

const blinkAnimation = keyframes`
	0% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
	100% {
		opacity: 1;
	}
`;

/**
 * Main container group for NodeHeader with move cursor and pointer-events disabled for children.
 */
export const MainContainerGroup = styled.g`
	cursor: move;
	pointer-events: none;

	* {
		pointer-events: none;
	}
`;

/**
 * Styled rect for icon background with optional blink animation
 */
export const IconBackgroundRect = styled.rect<{
	blinkIcon?: boolean;
}>`
	transition: fill 0.5s linear;
	${({ blinkIcon }) =>
		blinkIcon &&
		css`
			animation: ${blinkAnimation} 1s ease-in-out infinite;
		`};
`;
