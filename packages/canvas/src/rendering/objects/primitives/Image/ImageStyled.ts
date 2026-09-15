import styled from "@emotion/styled";

import { theme } from "../../../../theme/themeTokens";

/** The resolved file. Its contents are excluded from hit testing (the rect below takes it). */
export const ImageContent = styled("image")`
	pointer-events: none;
`;

/** Face of the placeholder standing in for a file that is not drawable (yet). */
export const ImagePlaceholderRect = styled.rect`
	fill: ${theme.objectSurface};
	fill-opacity: 0.6;
	stroke: ${theme.objectInk};
	stroke-opacity: 0.4;
	stroke-width: 1;
	stroke-dasharray: 6 5;
	pointer-events: none;
`;

/** The "no image" mark in the middle of a placeholder (a frame with a slash across it). */
export const ImagePlaceholderMark = styled.path`
	fill: none;
	stroke: ${theme.objectInk};
	stroke-opacity: 0.5;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
	pointer-events: none;
`;

/** Transparent rectangle that receives pointer events. */
export const ImageHitRect = styled.rect`
	fill: transparent;
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
