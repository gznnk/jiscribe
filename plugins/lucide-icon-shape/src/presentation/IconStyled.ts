import styled from "@emotion/styled";
import type { StrokePaintProps } from "@jiscribe/canvas-sdk";
import { strokePaint } from "@jiscribe/canvas-sdk";

/**
 * Transparent grab area over the whole box. The line art itself is far too thin to
 * hit reliably, and `transparent` still counts as painted where `none` would not.
 */
export const IconHitArea = styled.rect`
	fill: transparent;
	stroke: none;
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;

/**
 * The line art, holding the paint the icon's own elements inherit rather than
 * repeating it on each. Never hit-tested — {@link IconHitArea} underneath answers
 * for the whole shape, so a stroke crossing the box changes nothing.
 */
export const IconArtGroup = styled.g<StrokePaintProps>`
	${strokePaint}
	fill: none;
	stroke-linecap: round;
	stroke-linejoin: round;
	pointer-events: none;
`;

/**
 * Stand-in for an icon whose name resolves to nothing. Unreachable through the
 * parser, which rejects such a name outright, so this is what keeps a shape built
 * in memory visible instead of silently blank.
 */
export const IconPlaceholderRect = styled.rect<StrokePaintProps>`
	${strokePaint}
	fill: none;
	stroke-dasharray: 4 3;
	pointer-events: none;
`;
