import styled from "@emotion/styled";

import { theme } from "../../../../../../theme/themeTokens";

/**
 * Anchor of the badge inside the button. The button itself is the shared
 * `ObjectMenuButton`, so the positioning context belongs here rather than
 * there, and keeping the badge inside the button is what makes one selector
 * find it under the button's `data-part`.
 */
export const CommentIconWithBadge = styled.span`
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
`;

/**
 * Count of open threads, over the comment icon's top-right corner. Drawn only
 * while there is one, so it never reads as an empty badge, and it takes no
 * pointer events: the press belongs to the button underneath it.
 */
export const CommentCountBadge = styled.span`
	position: absolute;
	top: -3px;
	right: -5px;
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
	line-height: 1;
	pointer-events: none;
`;
