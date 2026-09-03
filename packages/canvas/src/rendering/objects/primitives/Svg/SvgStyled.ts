import styled from "@emotion/styled";

/** Group holding the injected SVG content. Its contents are excluded from hit testing. */
export const SvgContentGroup = styled.g`
	pointer-events: none;
`;

/** Transparent rectangle that receives pointer events. */
export const SvgHitRect = styled.rect`
	fill: transparent;
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;
