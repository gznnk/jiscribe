import styled from "@emotion/styled";

import { scrollbarStyles } from "../../../../constants/scrollbarStyles";
import { theme } from "../../../../constants/theme";

export const Body = styled.div`
	flex: 1;
	min-height: 0;
	padding: 8px 20px 20px;
	overflow-y: auto;
	${scrollbarStyles}
	/* Align command names (left column) and shortcuts (right column) across all rows */
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: center;
	column-gap: 24px;
	row-gap: 2px;
`;

export const CategoryTitle = styled.h3`
	/* Heading spanning both columns */
	grid-column: 1 / -1;
	justify-self: start;
	margin: 16px 0 8px;
	font-size: 12px;
	font-weight: 600;
	text-align: left;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: ${theme.foregroundMuted};
`;

export const RowLabel = styled.span`
	grid-column: 1;
	justify-self: start;
	padding: 4px 0;
	text-align: left;
`;

export const KeyGroup = styled.span`
	grid-column: 2;
	/* Left-align within the right column -> the leading key of every row aligns at the same x */
	justify-self: start;
	display: flex;
	align-items: center;
	gap: 4px;
`;

export const KeyCap = styled.kbd`
	min-width: 22px;
	padding: 2px 6px;
	border: 1px solid ${theme.borderSubtle};
	border-bottom-width: 2px;
	border-radius: 4px;
	background-color: ${theme.surfaceHover};
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	font-size: 12px;
	line-height: 1.4;
	text-align: center;
	color: ${theme.foreground};
`;
