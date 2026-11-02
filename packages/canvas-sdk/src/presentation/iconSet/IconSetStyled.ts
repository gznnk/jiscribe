import styled from "@emotion/styled";
import { canvasThemeCssVars as theme } from "@jiscribe/canvas/unstable";

/**
 * The group an icon's drawing sits in. It takes no clicks: the lines are thin
 * and the gaps between them wide, so the hit area underneath is what the
 * pointer meets.
 *
 * There is nothing else here — the fills are the vendor's own and are drawn as
 * authored, which is the condition the shipped sets are redistributed under.
 */
export const IconSetArtGroup = styled.g`
	pointer-events: none;
`;

/**
 * The transparent hit area filling the box. `transparent` counts as painted, so
 * it takes clicks (`none` would not).
 */
export const IconSetHitArea = styled.rect`
	fill: transparent;
	stroke: none;
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;

/**
 * The frame drawn in place of an icon that cannot be drawn: its name resolves
 * to nothing, or the catalog knows it but the drawings do not. Drawing nothing
 * would leave a shape that can be selected and not seen.
 */
export const IconSetPlaceholderRect = styled.rect`
	stroke: ${theme.objectInk};
	fill: none;
	stroke-dasharray: 4 3;
	pointer-events: none;
`;
