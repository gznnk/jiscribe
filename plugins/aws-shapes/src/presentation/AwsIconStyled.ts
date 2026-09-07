import styled from "@emotion/styled";
import { canvasThemeCssVars as theme } from "@jiscribe/canvas-sdk";

/**
 * The group an icon's drawing sits in. It takes no clicks: the lines are thin
 * and the gaps between them wide, so the hit area underneath is what the
 * pointer meets.
 *
 * There is nothing else here — the fills are AWS's own and are drawn as
 * authored, which is the condition the icons are redistributed under
 * (LICENSE-ICONS.md).
 */
export const AwsArtGroup = styled.g`
	pointer-events: none;
`;

/**
 * The transparent hit area filling the box. `transparent` counts as painted, so
 * it takes clicks (`none` would not).
 */
export const AwsIconHitArea = styled.rect`
	fill: transparent;
	stroke: none;
	pointer-events: auto;
	cursor: grab;

	&:focus {
		outline: none;
	}
`;

/**
 * The frame drawn in place of an icon whose name resolves to nothing. The parser
 * rejects such a name, so only an in-memory state reaches it — but drawing
 * nothing would leave a shape that can be selected and not seen.
 */
export const AwsIconPlaceholderRect = styled.rect`
	stroke: ${theme.objectInk};
	fill: none;
	stroke-dasharray: 4 3;
	pointer-events: none;
`;
