import styled from "@emotion/styled";
import { canvasThemeCssVars } from "@jiscribe/canvas-sdk";

/**
 * The strip the "no fill" button sits in, under the shared color grid. Its own
 * row rather than a swatch in the grid: the grid's palette is colors, and this
 * is the absence of one.
 */
export const NoFillRow = styled.div`
	display: flex;
	align-items: center;
	align-self: stretch;
	padding: 0 12px 12px;
	box-sizing: border-box;
	user-select: none;
`;

type NoFillButtonProps = {
	selected: boolean;
};

/**
 * Takes the background off the picked cells. Shaped like the grid's own "Auto"
 * button (ObjectMenuColorPickerGridStyled) so the two read as the same kind of
 * choice, and shown in the accent color while the cells carry no fill.
 */
export const NoFillButton = styled.button<NoFillButtonProps>`
	flex: 1;
	height: 28px;
	padding: 0 10px;
	box-sizing: border-box;
	border: 1px solid
		${({ selected }) =>
			selected ? canvasThemeCssVars.accent : canvasThemeCssVars.inputBorder};
	border-radius: ${canvasThemeCssVars.radius};
	background: ${canvasThemeCssVars.inputBg};
	color: ${({ selected }) =>
		selected ? canvasThemeCssVars.accent : canvasThemeCssVars.inputFg};
	font-size: 12px;
	cursor: pointer;
	user-select: none;
	transition: all 0.15s ease;

	&:hover {
		border-color: ${canvasThemeCssVars.accent};
	}
`;
