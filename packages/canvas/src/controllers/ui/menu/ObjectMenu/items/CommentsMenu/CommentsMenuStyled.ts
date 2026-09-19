import styled from "@emotion/styled";

import { CommentCountBadgeBase } from "../../../../comments/CommentsStyled";

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

/** The menu button's count badge, over the comment icon's top-right corner. */
export const CommentCountBadge = styled(CommentCountBadgeBase)`
	top: -3px;
	right: -5px;
`;
