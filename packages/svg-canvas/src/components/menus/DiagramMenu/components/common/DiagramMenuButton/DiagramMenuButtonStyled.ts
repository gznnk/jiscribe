import styled from "@emotion/styled";

export const DiagramMenuButtonDiv = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: 6px;
	border: 1px solid transparent;
	cursor: pointer;
	user-select: none;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: #f3f4f6;
	}

	&.active {
		background-color: #f9fafb;
		border-color: #6b7280;
	}

	svg {
		color: #6b7280;
		transition: color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
	}

	&:hover svg {
		color: #374151;
	}

	&.active svg {
		color: #374151;
	}
`;
