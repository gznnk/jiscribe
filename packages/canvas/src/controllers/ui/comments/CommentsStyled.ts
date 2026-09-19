import styled from "@emotion/styled";

import { theme } from "../../../theme/themeTokens";

/**
 * Pill carrying a count of open threads, drawn only while there is one so it
 * never reads as an empty badge. Both places that count threads build on it —
 * the ObjectMenu button's badge and the marker's — so the two read as the same
 * thing; each positions it over its own corner.
 */
export const CommentCountBadgeBase = styled.span`
	position: absolute;
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 14px;
	height: 14px;
	padding: 0 3px;
	box-sizing: border-box;
	border-radius: 7px;
	background-color: ${theme.accent};
	color: #ffffff;
	font-size: 10px;
	font-weight: 600;
	font-variant-numeric: tabular-nums;
	line-height: 1;
	pointer-events: none;
`;
