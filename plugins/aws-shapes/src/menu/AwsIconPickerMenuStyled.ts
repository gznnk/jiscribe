import styled from "@emotion/styled";
import {
	canvasThemeCssVars as theme,
	scrollbarStyles,
} from "@jiscribe/canvas-sdk";

export const AwsIconPickerPanel = styled.div`
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 8px;
	width: 300px;
	color: ${theme.foreground};
`;

export const AwsIconSearchInput = styled.input`
	width: 100%;
	height: 28px;
	box-sizing: border-box;
	padding: 0 8px;
	border: 1px solid ${theme.inputBorder};
	border-radius: ${theme.radius};
	background: ${theme.inputBg};
	color: ${theme.inputFg};
	font-size: 12px;

	&::placeholder {
		color: ${theme.inputPlaceholder};
	}

	&:focus {
		outline: 1px solid ${theme.accent};
		outline-offset: -1px;
	}
`;

/**
 * One row of filter chips; the layer row and the category row make two. The
 * horizontal scrollbar sits right under the chips, so the padding below holds it
 * off — flush against them it reads as one line with the chip's border.
 */
export const AwsFilterChipRow = styled.div`
	display: flex;
	flex-wrap: nowrap;
	gap: 4px;
	overflow-x: auto;
	padding-bottom: 8px;
	${scrollbarStyles}
`;

export const AwsFilterChip = styled.button<{ selected: boolean }>`
	flex: 0 0 auto;
	padding: 2px 8px;
	border: 1px solid
		${({ selected }) => (selected ? theme.accent : theme.borderSubtle)};
	border-radius: ${theme.radius};
	background: ${({ selected }) =>
		selected ? theme.surfaceActive : "transparent"};
	color: ${theme.foreground};
	font-size: 11px;
	white-space: nowrap;
	cursor: pointer;

	&:hover {
		background: ${theme.surfaceHover};
	}

	&:focus-visible {
		outline: 1px solid ${theme.accent};
		outline-offset: -1px;
	}
`;

export const AwsIconGrid = styled.div<{ isEmpty: boolean }>`
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	/* With nothing in it, the one line inside goes in the middle rather than at the top. */
	align-content: ${({ isEmpty }) => (isEmpty ? "center" : "start")};
	gap: 2px;
	/* A fixed number of rows. A panel opening upward grows from its bottom edge,
	   so a height that follows the count would slide the search field around
	   under the pointer. */
	height: 220px;
	overflow-y: auto;
	/* Keeps the last column out from under the scrollbar. */
	padding-right: 6px;
	overscroll-behavior: contain;
	${scrollbarStyles}
`;

export const AwsIconGridButton = styled.button<{ selected: boolean }>`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	padding: 0;
	border: 1px solid
		${({ selected }) => (selected ? theme.accent : "transparent")};
	border-radius: ${theme.radius};
	background: ${({ selected }) =>
		selected ? theme.surfaceActive : "transparent"};
	color: ${theme.iconForeground};
	cursor: pointer;

	&:hover {
		background: ${theme.surfaceHover};
	}

	&:focus-visible {
		outline: 1px solid ${theme.accent};
		outline-offset: -1px;
	}
`;

/**
 * A line spanning the grid: what a search that found nothing says, and how many
 * matches were cut. Inside the grid rather than beside it, so nothing to say
 * leaves no empty band.
 */
export const AwsIconGridMessage = styled.div`
	grid-column: 1 / -1;
	padding: 4px 0;
	font-size: 11px;
	color: ${theme.foregroundMuted};
	text-align: center;
`;
