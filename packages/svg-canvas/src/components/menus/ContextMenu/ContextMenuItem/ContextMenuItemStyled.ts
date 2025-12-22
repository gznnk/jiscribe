import styled from "@emotion/styled";

/**
 * Styled element for the context menu item.
 */
export const ContextMenuItemDiv = styled.div`
	font-size: 14px;
	line-height: 22px;
	color: #374151;
	padding: 6px 12px;
	margin: 0 4px;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
	display: flex;
	align-items: center;

	&:hover {
		background-color: #f3f4f6;
	}

	&:active {
		background-color: #e5e7eb;
	}

	&.disabled {
		color: #9ca3af;
		cursor: not-allowed;
		pointer-events: none;

		&:hover {
			background-color: transparent;
			color: #9ca3af;
		}
	}
`;
