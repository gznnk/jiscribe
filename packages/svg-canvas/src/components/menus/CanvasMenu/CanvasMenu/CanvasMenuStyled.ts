import styled from "@emotion/styled";

import { BOX_SHADOW } from "../../../../constants/styling/core/CommonStyling";

export const CanvasMenuDiv = styled.div`
	display: flex;
	flex-direction: column;
	gap: 4px;
	background-color: #ffffff;
	border: 1px solid #d9d9d9;
	padding: 4px;
	box-shadow: ${BOX_SHADOW};
	border-radius: 6px;
	pointer-events: none;
	user-select: none;

	& * {
		user-select: none;
	}
`;

export const CanvasMenuCategoryButton = styled.div<{ isActive?: boolean }>`
	width: 40px;
	height: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	border-radius: 4px;
	pointer-events: auto;
	transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
	color: ${(props) => (props.isActive ? "#1890ff" : "#666")};
	background-color: ${(props) => (props.isActive ? "#e6f4ff" : "transparent")};

	&:hover {
		background-color: ${(props) => (props.isActive ? "#e6f4ff" : "#f5f5f5")};
		color: #1890ff;
	}

	&:active {
		transform: scale(0.95);
	}
`;

export const CanvasMenuPositioner = styled.div`
	position: absolute;
	top: 10px;
	left: 10px;
	display: flex;
	flex-direction: row;
	gap: 8px;
	z-index: 1000;
`;
