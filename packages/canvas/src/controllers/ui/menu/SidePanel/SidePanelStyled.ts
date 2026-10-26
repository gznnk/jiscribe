import styled from "@emotion/styled";

import { theme } from "../../../../foundation/theme/themeTokens";

/**
 * Width of every side panel in px: the properties sidebar on the right and the
 * stencil panel on the left, docked or over the canvas. A properties row is a
 * label column plus a pair of number fields, which is what sets it.
 */
export const SIDE_PANEL_WIDTH = 280;

/**
 * Inset in px of a side panel's content, the heading included: a stencil
 * panel's search box, grid and rows, a properties section's body, and the right
 * end of a properties section's header. Measured from the panel's edge; inside
 * a scrolling list the right side counts from the scrollbar gutter instead,
 * unless the content gives the gutter back as StencilPanelGrid does.
 */
export const SIDE_PANEL_INSET = 12;

/** Title row of a side panel: the heading, then its buttons at the right. */
export const SidePanelHeader = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	flex: none;
	height: 36px;
	padding: 0 8px 0 ${SIDE_PANEL_INSET}px;
`;

/**
 * Panel heading. Sized as a section label rather than a document title; a long
 * one is cut short so the buttons beside it keep their place.
 */
export const SidePanelTitle = styled.div`
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 11px;
	font-weight: 600;
	letter-spacing: 0.04em;
	color: ${theme.foregroundMuted};
`;

/** The buttons at the right of a panel header, in a row. */
export const SidePanelHeaderButtons = styled.div`
	display: flex;
	flex: none;
	flex-direction: row;
	align-items: center;
	gap: 2px;
`;

/**
 * One button of a panel header (close, keep open, …): an icon on a square. A
 * toggle among them carries `aria-pressed`, and looks pressed while it is on.
 */
export const SidePanelHeaderButton = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	padding: 0;
	border: none;
	border-radius: ${theme.radius};
	background: transparent;
	color: ${theme.iconForeground};
	cursor: pointer;
	transition: background-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: ${theme.surfaceHover};
	}

	&[aria-pressed="true"] {
		background-color: ${theme.surfaceActive};
	}
`;
