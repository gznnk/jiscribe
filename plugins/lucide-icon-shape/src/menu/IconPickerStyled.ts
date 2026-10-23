import styled from "@emotion/styled";
import {
	canvasThemeCssVars as theme,
	scrollbarStyles,
} from "@jiscribe/canvas-sdk";

/**
 * The picker's own box. It takes the width of whatever holds it; a dropdown
 * panel shrinks to its content, so each host wraps it in IconPickerFrame.
 */
export const IconPickerPanel = styled.div`
	display: flex;
	flex-direction: column;
	gap: 6px;
	box-sizing: border-box;
	width: 100%;
	padding: 8px;
	color: ${theme.foreground};
`;

/**
 * Gives the picker its width in a dropdown panel. `max-width` lets a panel that
 * caps its own width (the sidebar's, when it opens under its trigger) narrow it.
 */
export const IconPickerFrame = styled.div`
	width: 284px;
	max-width: 100%;
`;

export const IconSearchInput = styled.input`
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

export const IconGrid = styled.div<{ isEmpty: boolean }>`
	display: grid;
	/* As many 30px cells as the width holds: eight at the frame's full width,
	   fewer where a panel narrows it. */
	grid-template-columns: repeat(auto-fill, minmax(30px, 1fr));
	/* Nothing to show means the one message inside sits in the middle of the empty box
	   rather than clinging to its top edge. */
	align-content: ${({ isEmpty }) => (isEmpty ? "center" : "start")};
	gap: 2px;
	/* 6 rows, fixed rather than capped: a panel that opens upward grows from its bottom
	   edge, so a grid that shrinks with the result count would walk the search field up
	   and down under the pointer. Taller than this and the panel meets the viewport edge. */
	height: 188px;
	overflow-y: auto;
	/* Keeps the last column clear of the scrollbar, which overlays the padding box. */
	padding-right: 6px;
	overscroll-behavior: contain;
	${scrollbarStyles}
`;

export const IconGridButton = styled.button<{ selected: boolean }>`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	padding: 0;
	border: 1px solid
		${({ selected }) => (selected ? theme.accent : "transparent")};
	border-radius: ${theme.radius};
	background: ${({ selected }) => (selected ? theme.surfaceActive : "transparent")};
	/* The glyph paints with currentColor, so the icon follows the theme from here. */
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
 * A line spanning the whole grid: what a search matched nothing says, and the count that
 * appears under a capped result set. Inside the grid rather than below it, so a panel with
 * nothing to say has no leftover strip of empty chrome.
 */
export const IconGridMessage = styled.div`
	grid-column: 1 / -1;
	padding: 4px 0;
	font-size: 11px;
	color: ${theme.foregroundMuted};
	text-align: center;
`;
