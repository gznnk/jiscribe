import styled from "@emotion/styled";

export const CanvasMenuItemDiv = styled.div`
	width: 32px;
	height: 32px;
	color: rgba(0, 0, 0, 0.65);
	box-sizing: border-box;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: auto;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:hover {
		background-color: #f5f5f5;
		color: #1890ff;
	}

	&:active {
		background-color: #e6f4ff;
		transform: scale(0.95);
	}

	svg {
		transition: color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
	}
`;
