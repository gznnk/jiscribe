import styled from "@emotion/styled";

import { scrollbarStyles } from "../../../../constants/scrollbarStyles";
import { theme } from "../../../../constants/theme";

/**
 * Width of the sidebar. Wider than the shape library: a row is a label column
 * plus a pair of number fields, and the fields are what the width goes to.
 */
const PANEL_WIDTH = "280px";

/**
 * The properties sidebar: a fixed-width column on the right of the viewport,
 * showing the settings of what is selected.
 *
 * `flex: none` keeps it at its width while the viewport takes the rest; it takes
 * space rather than floating over the canvas, so nothing it covers is lost.
 * Being on the right it moves only the viewport's right edge, so the drawing
 * keeps its place with no camera compensation (unlike the shape library, whose
 * moving left edge is compensated in the CONTAINER_RESIZE case of canvasReducer).
 */
export const PropertyPanelContainer = styled.aside`
	/* Anchors the dropdown panels portalled here (see PropertyPanelOverlayHostContext). */
	position: relative;
	flex: none;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	width: ${PANEL_WIDTH};
	background: ${theme.surface};
	border-left: 1px solid ${theme.border};
	user-select: none;
`;

/** Title row of the panel: the heading and the close button. */
export const PropertyPanelHeader = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	height: 36px;
	padding: 0 8px 0 12px;
`;

/** Panel heading. Sized as a section label rather than a document title. */
export const PropertyPanelTitle = styled.div`
	font-size: 11px;
	font-weight: 600;
	letter-spacing: 0.04em;
	color: ${theme.foregroundMuted};
`;

/** Close (x) button of the panel header. */
export const PropertyPanelCloseButton = styled.button`
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
`;

/** Scrolling body holding the property sections. */
export const PropertyPanelBody = styled.div`
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	/* The gutter is reserved from the start, so a section growing past the panel's
	   height does not shrink the rows that are already laid out. */
	scrollbar-gutter: stable;
	padding-bottom: 8px;
	${scrollbarStyles}
`;

/**
 * Header of one property section. Copied from the shape library's section
 * headers so the two sidebars read as one pair of panels.
 */
export const PropertyPanelSectionHeader = styled.button`
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 6px;
	width: 100%;
	height: 28px;
	padding: 0 12px 0 8px;
	border: none;
	background: transparent;
	color: ${theme.foreground};
	font-size: 12px;
	text-align: left;
	cursor: pointer;

	&:hover {
		background-color: ${theme.surfaceHover};
	}
`;

/**
 * Disclosure chevron of a section header. Drawn pointing right and rotated a
 * quarter turn while the section is expanded, so the turn animates.
 */
export const PropertyPanelSectionChevron = styled.span<{
	isExpanded: boolean;
}>`
	display: flex;
	align-items: center;
	color: ${theme.foregroundMuted};
	transform: rotate(${(props) => (props.isExpanded ? "90deg" : "0deg")});
	transition: transform 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
`;

/** Section label; takes the free space left over by the chevron. */
export const PropertyPanelSectionLabel = styled.span`
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

/** Side padding of a section body, aligned with the shape library's stencil grid. */
const SECTION_PADDING_X = 12;

/** Width of a row's label column. */
const ROW_LABEL_WIDTH = 56;

/** Gap between a row's label column and its control. */
const ROW_GAP = 6;

/** Rows of an expanded section. */
export const PropertyPanelSectionBody = styled.div`
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 4px ${SECTION_PADDING_X}px 8px;
`;

/** One property row: its label, and the control that states the value. */
export const PropertyPanelRowContainer = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: ${ROW_GAP}px;
	min-height: 28px;
`;

/**
 * Label column of a row. Fixed width so every control in the panel starts on
 * the same line, whatever the label says. Pinned to the row's top line rather
 * than its middle, so a dropdown opening under the control does not carry the
 * label down with it.
 */
export const PropertyPanelRowLabel = styled.span`
	flex: none;
	align-self: flex-start;
	width: ${ROW_LABEL_WIDTH}px;
	line-height: 28px;
	overflow: hidden;
	font-size: 11px;
	color: ${theme.foregroundMuted};
	text-overflow: ellipsis;
	white-space: nowrap;
`;

/** Control column of a row; takes whatever the label leaves. */
export const PropertyPanelRowControl = styled.div`
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 6px;
`;

/**
 * Two equal columns for the paired number fields (X/Y, W/H). Rotation sits in
 * the first column alone, so it lines up under X and W.
 */
export const PropertyPanelFieldGrid = styled.div`
	flex: 1;
	min-width: 0;
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 6px;
`;
